import { createHash } from "crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Payment } from "../entities/payment.entity";
import { IdempotencyKeyRecord } from "../entities/idempotency-key.entity";
import {
  PaymentMethod,
  PaymentStatus,
  VisitStatus,
} from "../../../common/constants";
import {
  AllocatableInstallment,
  PaymentAllocationPlan,
  allocatePaymentFifo,
  sumAllocations,
} from "../domain/fifo-allocation";
import {
  computeInstallmentStatus,
  roundMoney,
} from "../../credits/domain/installment-schedule";
import { todayInTimezone } from "../../clients/domain/client.types";

export const PAYMENT_IDEMPOTENCY_SCOPE = "payment_create";

export interface CreatePaymentInput {
  clientId: string;
  collectorId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  requestHash: string;
  notes?: string;
  capturedAt: Date;
  deviceId?: string;
  location?: { lat: number; lng: number };
  installmentIds?: string[];
}

export interface CreatePaymentResult {
  paymentId: string;
  clientId: string;
  amount: number;
  status: PaymentStatus;
  allocations: PaymentAllocationPlan[];
  clientVisitStatus: VisitStatus;
  receipt: { id: string; status: "generating" };
  cached: boolean;
  httpStatus: number;
}

@Injectable()
export class PaymentsRepository {
  private readonly timezone: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(IdempotencyKeyRecord)
    private readonly idempotencyRepository: Repository<IdempotencyKeyRecord>,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.timezone = configService.get<string>("timezone", "America/Bogota");
  }

  static hashRequestBody(payload: unknown): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  async findIdempotencyRecord(
    actorId: string,
    key: string,
  ): Promise<IdempotencyKeyRecord | null> {
    return this.idempotencyRepository.findOne({
      where: {
        scope: PAYMENT_IDEMPOTENCY_SCOPE,
        actorId,
        key,
      },
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const today = todayInTimezone(this.timezone);

    return this.dataSource.transaction(async (manager) => {
      const existingIdempotency = await manager.query(
        `SELECT request_hash, response_status, response_body
         FROM idempotency_keys
         WHERE scope = $1 AND actor_id = $2 AND key = $3
         FOR UPDATE`,
        [PAYMENT_IDEMPOTENCY_SCOPE, input.collectorId, input.idempotencyKey],
      );

      if (existingIdempotency.length > 0) {
        const row = existingIdempotency[0] as {
          request_hash: string;
          response_status: number;
          response_body: CreatePaymentResult;
        };
        if (row.request_hash !== input.requestHash) {
          const error = new Error("PAYMENT_IDEMPOTENCY_CONFLICT");
          throw error;
        }
        return {
          ...row.response_body,
          cached: true,
          httpStatus: row.response_status,
        };
      }

      const installmentRows = await manager.query(
        `SELECT
          i.id,
          i.installment_number,
          i.due_date,
          i.amount_due,
          i.amount_paid,
          i.status
        FROM installments i
        INNER JOIN credits c ON c.id = i.credit_id
        WHERE c.client_id = $1
          AND c.status = 'active'
          AND i.status IN ('pending', 'partial', 'overdue')
        ORDER BY i.due_date ASC, i.installment_number ASC
        FOR UPDATE OF i`,
        [input.clientId],
      );

      const allocatable: AllocatableInstallment[] = installmentRows.map(
        (row: Record<string, unknown>) => ({
          id: row.id as string,
          installmentNumber: Number(row.installment_number),
          dueDate: String(row.due_date).slice(0, 10),
          amountDue: Number(row.amount_due),
          amountPaid: Number(row.amount_paid),
        }),
      );

      const plans = allocatePaymentFifo(
        input.amount,
        allocatable,
        input.installmentIds,
      );

      if (plans.length === 0 || sumAllocations(plans) <= 0) {
        const error = new Error("PAYMENT_NO_ALLOCATION");
        throw error;
      }

      if (roundMoney(sumAllocations(plans)) > roundMoney(input.amount)) {
        const error = new Error("PAYMENT_INVALID_AMOUNT");
        throw error;
      }

      let locationSql = "NULL";
      const paymentParams: unknown[] = [
        input.clientId,
        input.collectorId,
        input.amount,
        input.paymentMethod,
        PaymentStatus.COMPLETED,
        input.idempotencyKey,
        input.notes ?? null,
        input.capturedAt.toISOString(),
        input.deviceId ?? null,
      ];

      if (input.location) {
        locationSql = `ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography`;
        paymentParams.push(input.location.lng, input.location.lat);
      }

      const paymentInsert = await manager.query(
        `INSERT INTO payments (
          client_id, collector_id, amount, payment_method, status,
          idempotency_key, notes, captured_at, device_id, geo_location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${locationSql})
        RETURNING id`,
        paymentParams,
      );
      const paymentId = paymentInsert[0].id as string;

      for (const plan of plans) {
        await manager.query(
          `INSERT INTO payment_allocations (payment_id, installment_id, amount)
           VALUES ($1, $2, $3)`,
          [paymentId, plan.installmentId, plan.amount],
        );

        const installment = allocatable.find((item) => item.id === plan.installmentId)!;
        const newPaid = roundMoney(installment.amountPaid + plan.amount);
        const newStatus = computeInstallmentStatus(
          installment.amountDue,
          newPaid,
          installment.dueDate,
          today,
        );

        await manager.query(
          `UPDATE installments
           SET amount_paid = $2,
               status = $3,
               updated_at = now(),
               overdue_at = CASE WHEN $3 = 'overdue' THEN COALESCE(overdue_at, now()) ELSE overdue_at END
           WHERE id = $1`,
          [plan.installmentId, newPaid, newStatus],
        );
      }

      const visitStatus = await this.updateVisitStatuses(
        manager,
        input.clientId,
        today,
      );

      const receiptNumber = `RCP-${Date.now()}-${paymentId.slice(0, 8)}`;
      const receiptInsert = await manager.query(
        `INSERT INTO receipts (
          payment_id, receipt_number, storage_key, generated_at
        ) VALUES ($1, $2, $3, now())
        RETURNING id`,
        [paymentId, receiptNumber, `pending/${paymentId}`],
      );

      const result: CreatePaymentResult = {
        paymentId,
        clientId: input.clientId,
        amount: input.amount,
        status: PaymentStatus.COMPLETED,
        allocations: plans,
        clientVisitStatus: visitStatus,
        receipt: {
          id: receiptInsert[0].id as string,
          status: "generating",
        },
        cached: false,
        httpStatus: 201,
      };

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);

      await manager.query(
        `INSERT INTO idempotency_keys (
          key, scope, actor_id, request_hash, response_status, response_body, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.idempotencyKey,
          PAYMENT_IDEMPOTENCY_SCOPE,
          input.collectorId,
          input.requestHash,
          201,
          JSON.stringify(result),
          expiresAt.toISOString(),
        ],
      );

      await manager.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
         VALUES ($1, 'PAYMENT_RECORD', 'payment', $2, $3)`,
        [
          input.collectorId,
          paymentId,
          JSON.stringify({ amount: input.amount, clientId: input.clientId }),
        ],
      );

      for (const plan of plans) {
        const creditRows = await manager.query(
          `SELECT credit_id FROM installments WHERE id = $1`,
          [plan.installmentId],
        );
        const creditId = creditRows[0]?.credit_id as string;
        if (creditId) {
          const openRows = await manager.query(
            `SELECT COUNT(*)::int AS open_count
             FROM installments
             WHERE credit_id = $1 AND status NOT IN ('paid', 'waived')`,
            [creditId],
          );
          if ((openRows[0]?.open_count ?? 0) === 0) {
            await manager.query(
              `UPDATE credits SET status = 'closed', closed_at = now(), updated_at = now()
               WHERE id = $1`,
              [creditId],
            );
          }
        }
      }

      return result;
    });
  }

  private async updateVisitStatuses(
    manager: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
    clientId: string,
    visitDate: string,
  ): Promise<VisitStatus> {
    const dueTodayRows = (await manager.query(
      `SELECT COALESCE(SUM(i.amount_due - i.amount_paid), 0) AS remaining
       FROM installments i
       INNER JOIN credits c ON c.id = i.credit_id
       WHERE c.client_id = $1
         AND c.status = 'active'
         AND i.due_date = $2::date
         AND i.status IN ('pending', 'partial', 'overdue')`,
      [clientId, visitDate],
    )) as Array<{ remaining: string | number }>;
    const remainingToday = Number(dueTodayRows[0]?.remaining ?? 0);

    const paidTodayRows = (await manager.query(
      `SELECT COALESCE(SUM(p.amount), 0) AS paid
       FROM payments p
       WHERE p.client_id = $1
         AND p.status = 'completed'
         AND p.captured_at::date = $2::date`,
      [clientId, visitDate],
    )) as Array<{ paid: string | number }>;
    const paidToday = Number(paidTodayRows[0]?.paid ?? 0);

    let visitStatus: VisitStatus = VisitStatus.PENDING;
    if (remainingToday <= 0 && paidToday > 0) {
      visitStatus = VisitStatus.PAID;
    } else if (paidToday > 0) {
      visitStatus = VisitStatus.VISITED;
    }

    const routes = await manager.query(
      `SELECT route_id FROM route_client_assignments WHERE client_id = $1`,
      [clientId],
    );

    for (const route of routes as Array<{ route_id: string }>) {
      await manager.query(
        `INSERT INTO daily_visit_snapshots (route_id, client_id, visit_date, visit_status)
         VALUES ($1, $2, $3::date, $4)
         ON CONFLICT (route_id, client_id, visit_date)
         DO UPDATE SET visit_status = EXCLUDED.visit_status`,
        [route.route_id, clientId, visitDate, visitStatus],
      );

      await manager.query(
        `UPDATE route_client_assignments
         SET visit_status = $3
         WHERE route_id = $1 AND client_id = $2`,
        [route.route_id, clientId, visitStatus],
      );
    }

    return visitStatus;
  }

  async findPaymentById(paymentId: string) {
    const rows = await this.dataSource.query(
      `SELECT
        p.id,
        p.client_id,
        p.collector_id,
        p.amount,
        p.payment_method,
        p.status,
        p.notes,
        p.captured_at,
        p.recorded_at,
        p.reversed_at,
        p.reversal_reason
      FROM payments p
      WHERE p.id = $1`,
      [paymentId],
    );
    return rows[0] ?? null;
  }

  async findPaymentAllocations(paymentId: string) {
    return this.dataSource.query(
      `SELECT
        pa.id,
        pa.amount,
        i.id AS installment_id,
        i.installment_number
      FROM payment_allocations pa
      INNER JOIN installments i ON i.id = pa.installment_id
      WHERE pa.payment_id = $1`,
      [paymentId],
    );
  }

  async listPayments(filters: {
    page: number;
    limit: number;
    clientId?: string;
    collectorId?: string;
    status?: PaymentStatus;
    from?: string;
    to?: string;
  }) {
    const conditions = ["1=1"];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.clientId) {
      conditions.push(`p.client_id = $${idx++}`);
      params.push(filters.clientId);
    }
    if (filters.collectorId) {
      conditions.push(`p.collector_id = $${idx++}`);
      params.push(filters.collectorId);
    }
    if (filters.status) {
      conditions.push(`p.status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.from) {
      conditions.push(`p.recorded_at >= $${idx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`p.recorded_at <= $${idx++}`);
      params.push(filters.to);
    }

    const where = conditions.join(" AND ");
    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM payments p WHERE ${where}`,
      params,
    );
    const total = countRows[0]?.total ?? 0;
    const offset = (filters.page - 1) * filters.limit;

    const rows = await this.dataSource.query(
      `SELECT
        p.id,
        p.client_id,
        p.collector_id,
        p.amount,
        p.payment_method,
        p.status,
        p.captured_at,
        p.recorded_at
      FROM payments p
      WHERE ${where}
      ORDER BY p.recorded_at DESC
      LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, filters.limit, offset],
    );

    return { rows, total };
  }

  async reversePayment(
    paymentId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    const today = todayInTimezone(this.timezone);

    await this.dataSource.transaction(async (manager) => {
      const paymentRows = await manager.query(
        `SELECT id, client_id, amount, status
         FROM payments
         WHERE id = $1
         FOR UPDATE`,
        [paymentId],
      );
      if (!paymentRows.length) {
        throw new Error("PAYMENT_NOT_FOUND");
      }
      const payment = paymentRows[0] as {
        id: string;
        client_id: string;
        status: string;
      };
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new Error("PAYMENT_NOT_REVERSIBLE");
      }

      const allocations = await manager.query(
        `SELECT installment_id, amount
         FROM payment_allocations
         WHERE payment_id = $1`,
        [paymentId],
      );

      for (const allocation of allocations as Array<{
        installment_id: string;
        amount: string;
      }>) {
        const installmentRows = await manager.query(
          `SELECT amount_due, amount_paid, due_date
           FROM installments
           WHERE id = $1
           FOR UPDATE`,
          [allocation.installment_id],
        );
        const installment = installmentRows[0] as {
          amount_due: string;
          amount_paid: string;
          due_date: string;
        };
        const newPaid = roundMoney(
          Number(installment.amount_paid) - Number(allocation.amount),
        );
        const newStatus = computeInstallmentStatus(
          Number(installment.amount_due),
          newPaid,
          String(installment.due_date).slice(0, 10),
          today,
        );
        await manager.query(
          `UPDATE installments
           SET amount_paid = $2, status = $3, updated_at = now()
           WHERE id = $1`,
          [allocation.installment_id, Math.max(0, newPaid), newStatus],
        );
      }

      await manager.query(
        `UPDATE payments
         SET status = $2, reversed_at = now(), reversed_by = $3, reversal_reason = $4
         WHERE id = $1`,
        [paymentId, PaymentStatus.REVERSED, adminId, reason],
      );

      await manager.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
         VALUES ($1, 'PAYMENT_RECORD', 'payment', $2, $3)`,
        [
          adminId,
          paymentId,
          JSON.stringify({ status: PaymentStatus.REVERSED, reason }),
        ],
      );
    });
  }
}
