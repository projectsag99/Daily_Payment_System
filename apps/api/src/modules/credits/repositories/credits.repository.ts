import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Credit } from "../entities/credit.entity";
import { Installment } from "../entities/installment.entity";
import { CreditStatus } from "../../../common/constants";
import { InstallmentScheduleItem } from "../domain/installment-schedule";

@Injectable()
export class CreditsRepository {
  constructor(
    @InjectRepository(Credit)
    private readonly creditRepository: Repository<Credit>,
    @InjectRepository(Installment)
    private readonly installmentRepository: Repository<Installment>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(creditId: string): Promise<Credit | null> {
    return this.creditRepository.findOne({ where: { id: creditId } });
  }

  async findByIdWithClient(creditId: string) {
    const rows = await this.dataSource.query(
      `SELECT
        c.id,
        c.client_id,
        c.route_id,
        c.currency,
        c.principal_amount,
        c.interest_rate,
        c.total_installments,
        c.installment_amount,
        c.start_date,
        c.status,
        c.notes,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.closed_at,
        cl.first_name,
        cl.last_name,
        cl.code AS client_code,
        r.country AS route_country,
        r.name AS route_name
      FROM credits c
      INNER JOIN clients cl ON cl.id = c.client_id
      LEFT JOIN routes r ON r.id = c.route_id
      WHERE c.id = $1`,
      [creditId],
    );
    return rows[0] ?? null;
  }

  async createCreditWithSchedule(input: {
    clientId: string;
    routeId: string | null;
    currency: string;
    principalAmount: number;
    interestRate?: number;
    totalInstallments: number;
    installmentAmount: number;
    startDate: string;
    notes?: string;
    createdById: string;
    schedule: InstallmentScheduleItem[];
  }): Promise<Credit> {
    return this.dataSource.transaction(async (manager) => {
      const creditRows = await manager.query(
        `INSERT INTO credits (
          client_id, route_id, currency, principal_amount, interest_rate,
          total_installments, installment_amount, start_date, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          input.clientId,
          input.routeId,
          input.currency,
          input.principalAmount,
          input.interestRate ?? null,
          input.totalInstallments,
          input.installmentAmount,
          input.startDate,
          input.notes ?? null,
          input.createdById,
        ],
      );

      const credit = creditRows[0] as Credit;

      for (const item of input.schedule) {
        await manager.query(
          `INSERT INTO installments (
            credit_id, installment_number, due_date, amount_due, amount_paid, status
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            credit.id,
            item.installmentNumber,
            item.dueDate,
            item.amountDue,
            item.amountPaid ?? 0,
            item.status ?? "pending",
          ],
        );
      }

      return credit;
    });
  }

  async listInstallments(creditId: string) {
    return this.dataSource.query(
      `SELECT
        id,
        installment_number,
        due_date,
        amount_due,
        amount_paid,
        status,
        overdue_at,
        created_at,
        updated_at
      FROM installments
      WHERE credit_id = $1
      ORDER BY installment_number ASC`,
      [creditId],
    );
  }

  async regenerateInstallments(
    creditId: string,
    schedule: InstallmentScheduleItem[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const paidCount = await manager.query(
        `SELECT COUNT(*)::int AS count
         FROM installments
         WHERE credit_id = $1 AND amount_paid > 0`,
        [creditId],
      );
      if ((paidCount[0]?.count ?? 0) > 0) {
        throw new Error("CREDIT_HAS_PAYMENTS");
      }

      await manager.query(`DELETE FROM installments WHERE credit_id = $1`, [creditId]);

      for (const item of schedule) {
        await manager.query(
          `INSERT INTO installments (
            credit_id, installment_number, due_date, amount_due
          ) VALUES ($1, $2, $3, $4)`,
          [creditId, item.installmentNumber, item.dueDate, item.amountDue],
        );
      }
    });
  }

  async creditBelongsToClient(creditId: string, clientId: string): Promise<boolean> {
    const credit = await this.creditRepository.findOne({
      where: { id: creditId, clientId },
    });
    return credit !== null;
  }

  async closeCreditIfFullyPaid(creditId: string): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS open_count
       FROM installments
       WHERE credit_id = $1 AND status NOT IN ('paid', 'waived')`,
      [creditId],
    );
    if ((rows[0]?.open_count ?? 0) === 0) {
      await this.creditRepository.update(creditId, {
        status: CreditStatus.CLOSED,
        closedAt: new Date(),
      });
    }
  }
}
