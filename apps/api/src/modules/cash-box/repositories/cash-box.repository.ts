import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { DataSource, Repository } from "typeorm";
import { CashBoxExpense } from "../entities/cash-box-expense.entity";
import { CashBoxExpenseReceipt } from "../entities/cash-box-expense-receipt.entity";
import { CashBoxInitialBalance } from "../entities/cash-box-initial-balance.entity";
import {
  paymentCapturedBusinessDateSql,
  paymentCapturedOnDateSql,
  timestampOnBusinessDateSql,
} from "../../credits/domain/business-days";

export interface CashBoxAssignedRouteRow {
  id: string;
  name: string;
  shift: string;
}

export interface CashBoxDayRow {
  day: string;
  collected: string;
  payments_count: string;
  renewals_out: string;
  renewals_count: string;
  expenses_total: string;
}

export interface CashBoxPaymentRow {
  id: string;
  amount: string;
  captured_at: Date;
  client_code: string;
  client_name: string;
}

export interface CashBoxRenewalRow {
  id: string;
  created_at: Date;
  renewal_amount: string;
  client_code: string;
  client_name: string;
}

export interface CashBoxDisbursementRow {
  id: string;
  created_at: Date;
  amount: string;
  client_code: string;
  client_name: string;
  kind: "renewal" | "onboard";
}

export interface CashBoxExpenseRow {
  id: string;
  amount: string;
  description: string;
  expense_date: string;
  route_id: string | null;
  category: "route" | "office";
  created_at: Date;
  route_name: string | null;
}

export interface CashBoxExpenseReceiptRow {
  id: string;
  expense_id: string;
  storage_key: string;
  mime_type: string;
  original_file_name: string | null;
  created_at: Date;
}

export interface CashBoxRouteDayAmountRow {
  day: string;
  route_id: string;
  total: string;
}

export interface CashBoxOfficeDayRow {
  day: string;
  total: string;
  descriptions: string | null;
}

export interface CashBoxTotalsRow {
  total_collected: string;
  total_renewals_out: string;
  total_expenses: string;
}

@Injectable()
export class CashBoxRepository {
  private readonly timezone: string;

  constructor(
    @InjectRepository(CashBoxExpense)
    private readonly expenseRepository: Repository<CashBoxExpense>,
    @InjectRepository(CashBoxExpenseReceipt)
    private readonly expenseReceiptRepository: Repository<CashBoxExpenseReceipt>,
    @InjectRepository(CashBoxInitialBalance)
    private readonly initialBalanceRepository: Repository<CashBoxInitialBalance>,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.timezone = configService.get<string>("timezone", "America/Montevideo");
  }

  private paymentBusinessDate(column: string): string {
    return paymentCapturedBusinessDateSql(column, this.timezone);
  }

  private paymentOnDate(column: string, dateParam: string): string {
    return paymentCapturedOnDateSql(column, dateParam, this.timezone);
  }

  private timestampOnDate(column: string, dateParam: string): string {
    return timestampOnBusinessDateSql(column, dateParam, this.timezone);
  }

  async findAssignedRoutes(
    collectorId: string,
    from: string,
    to: string,
  ): Promise<CashBoxAssignedRouteRow[]> {
    return this.dataSource.query(
      `SELECT r.id, r.name, r.shift::text AS shift
       FROM routes r
       INNER JOIN route_collector_assignments rco ON rco.route_id = r.id
       WHERE rco.collector_id = $1
         AND r.deleted_at IS NULL
         AND r.is_active = true
         AND rco.effective_from <= $3::date
         AND (rco.effective_to IS NULL OR rco.effective_to >= $2::date)
       GROUP BY r.id, r.name, r.shift
       ORDER BY r.shift ASC, r.name ASC`,
      [collectorId, from, to],
    );
  }

  async getTotals(
    collectorId: string,
    routeId?: string,
    periodStart?: string | null,
  ): Promise<CashBoxTotalsRow> {
    const paymentRouteFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = p.client_id AND rca.route_id = $2
         )`
      : "";
    const renewalRouteFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = (al.after_state->>'clientId')::uuid
             AND rca.route_id = $2
         )`
      : "";
    const onboardRouteFilter = routeId
      ? `AND (al.after_state->>'routeId')::uuid = $2`
      : "";
    const expenseRouteFilter = routeId ? `AND e.route_id = $2` : "";
    const periodPaymentFilter = periodStart
      ? `AND ${this.paymentBusinessDate("p.captured_at")} >= $${routeId ? 3 : 2}::date`
      : "";
    const periodRenewalFilter = periodStart
      ? `AND ${this.paymentBusinessDate("al.created_at")} >= $${routeId ? 3 : 2}::date`
      : "";
    const periodOnboardFilter = periodStart
      ? `AND ${this.paymentBusinessDate("al.created_at")} >= $${routeId ? 3 : 2}::date`
      : "";
    const periodExpenseFilter = periodStart
      ? `AND e.expense_date >= $${routeId ? 3 : 2}::date`
      : "";
    const params: unknown[] = routeId
      ? [collectorId, routeId]
      : [collectorId];
    if (periodStart) {
      params.push(periodStart);
    }

    const rows = await this.dataSource.query(
      `SELECT
        (
          SELECT COALESCE(SUM(p.amount), 0)::text
          FROM payments p
          WHERE p.collector_id = $1 AND p.status = 'completed'
          ${paymentRouteFilter}
          ${periodPaymentFilter}
        ) AS total_collected,
        (
          SELECT COALESCE(SUM(loan_out.total), 0)::text
          FROM (
            SELECT (al.after_state->>'renewalAmount')::numeric AS total
            FROM audit_logs al
            WHERE al.entity_type = 'credit_renew' AND al.actor_id = $1
            ${renewalRouteFilter}
            ${periodRenewalFilter}
            UNION ALL
            SELECT (al.after_state->>'loanAmount')::numeric AS total
            FROM audit_logs al
            WHERE al.entity_type = 'client_onboard' AND al.actor_id = $1
            ${onboardRouteFilter}
            ${periodOnboardFilter}
          ) loan_out
        ) AS total_renewals_out,
        (
          SELECT COALESCE(SUM(e.amount), 0)::text
          FROM cash_box_expenses e
          WHERE e.collector_id = $1
          ${expenseRouteFilter}
          ${periodExpenseFilter}
        ) AS total_expenses`,
      params,
    );
    return rows[0] as CashBoxTotalsRow;
  }

  async getDailyRows(
    collectorId: string,
    from: string,
    to: string,
    routeId?: string,
  ): Promise<CashBoxDayRow[]> {
    const paymentRouteFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = p.client_id AND rca.route_id = $4
         )`
      : "";
    const renewalRouteFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = (al.after_state->>'clientId')::uuid
             AND rca.route_id = $4
         )`
      : "";
    const onboardRouteFilter = routeId
      ? `AND (al.after_state->>'routeId')::uuid = $4`
      : "";
    const expenseRouteFilter = routeId ? `AND e.route_id = $4` : "";
    const payDay = this.paymentBusinessDate("p.captured_at");
    const renewalDay = this.paymentBusinessDate("al.created_at");
    const params = routeId
      ? [collectorId, from, to, routeId]
      : [collectorId, from, to];

    return this.dataSource.query(
      `WITH date_series AS (
        SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS day
      ),
      collections AS (
        SELECT ${payDay} AS day,
               COALESCE(SUM(p.amount), 0) AS total,
               COUNT(*)::int AS cnt
        FROM payments p
        WHERE p.collector_id = $1
          AND p.status = 'completed'
          AND ${payDay} BETWEEN $2::date AND $3::date
          ${paymentRouteFilter}
        GROUP BY 1
      ),
      renewals AS (
        SELECT day, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(cnt), 0)::int AS cnt
        FROM (
          SELECT ${renewalDay} AS day,
                 (al.after_state->>'renewalAmount')::numeric AS total,
                 1 AS cnt
          FROM audit_logs al
          WHERE al.entity_type = 'credit_renew'
            AND al.actor_id = $1
            AND ${renewalDay} BETWEEN $2::date AND $3::date
            ${renewalRouteFilter}
          UNION ALL
          SELECT ${renewalDay} AS day,
                 (al.after_state->>'loanAmount')::numeric AS total,
                 1 AS cnt
          FROM audit_logs al
          WHERE al.entity_type = 'client_onboard'
            AND al.actor_id = $1
            AND ${renewalDay} BETWEEN $2::date AND $3::date
            AND al.after_state->>'routeId' IS NOT NULL
            ${onboardRouteFilter}
        ) loan_out
        GROUP BY 1
      ),
      expenses AS (
        SELECT e.expense_date AS day,
               COALESCE(SUM(e.amount), 0) AS total
        FROM cash_box_expenses e
        WHERE e.collector_id = $1
          AND e.expense_date BETWEEN $2::date AND $3::date
          ${expenseRouteFilter}
        GROUP BY 1
      )
      SELECT
        ds.day::text AS day,
        COALESCE(c.total, 0)::text AS collected,
        COALESCE(c.cnt, 0)::text AS payments_count,
        COALESCE(r.total, 0)::text AS renewals_out,
        COALESCE(r.cnt, 0)::text AS renewals_count,
        COALESCE(e.total, 0)::text AS expenses_total
      FROM date_series ds
      LEFT JOIN collections c ON c.day = ds.day
      LEFT JOIN renewals r ON r.day = ds.day
      LEFT JOIN expenses e ON e.day = ds.day
      ORDER BY ds.day DESC`,
      params,
    );
  }

  async getPaymentsForDay(
    collectorId: string,
    date: string,
    routeId?: string,
  ): Promise<CashBoxPaymentRow[]> {
    const routeFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = p.client_id AND rca.route_id = $3
         )`
      : "";
    const payOnDate = this.paymentOnDate("p.captured_at", "$2");
    const params = routeId
      ? [collectorId, date, routeId]
      : [collectorId, date];

    return this.dataSource.query(
      `SELECT
        p.id,
        p.amount::text,
        p.captured_at,
        c.code AS client_code,
        TRIM(c.first_name || ' ' || c.last_name) AS client_name
       FROM payments p
       INNER JOIN clients c ON c.id = p.client_id
       WHERE p.collector_id = $1
         AND p.status = 'completed'
         AND ${payOnDate}
         ${routeFilter}
       ORDER BY p.captured_at ASC`,
      params,
    );
  }

  async getRenewalsForDay(
    collectorId: string,
    date: string,
    routeId?: string,
  ): Promise<CashBoxRenewalRow[]> {
    const routeFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = c.id AND rca.route_id = $3
         )`
      : "";
    const renewalOnDate = this.timestampOnDate("al.created_at", "$2");
    const params = routeId
      ? [collectorId, date, routeId]
      : [collectorId, date];

    return this.dataSource.query(
      `SELECT
        al.id,
        al.created_at,
        (al.after_state->>'renewalAmount')::text AS renewal_amount,
        c.code AS client_code,
        TRIM(c.first_name || ' ' || c.last_name) AS client_name
       FROM audit_logs al
       INNER JOIN clients c ON c.id = (al.after_state->>'clientId')::uuid
       WHERE al.entity_type = 'credit_renew'
         AND al.actor_id = $1
         AND ${renewalOnDate}
         ${routeFilter}
       ORDER BY al.created_at ASC`,
      params,
    );
  }

  async getDisbursementsForDay(
    collectorId: string,
    date: string,
    routeId?: string,
  ): Promise<CashBoxDisbursementRow[]> {
    const renewalOnDate = this.timestampOnDate("al.created_at", "$2");
    const renewalRouteFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = c.id AND rca.route_id = $3
         )`
      : "";
    const onboardRouteFilter = routeId
      ? `AND (al.after_state->>'routeId')::uuid = $3`
      : "";
    const params = routeId
      ? [collectorId, date, routeId]
      : [collectorId, date];

    return this.dataSource.query(
      `SELECT id, created_at, amount, client_code, client_name, kind
       FROM (
         SELECT
           al.id,
           al.created_at,
           (al.after_state->>'renewalAmount')::text AS amount,
           c.code AS client_code,
           TRIM(c.first_name || ' ' || c.last_name) AS client_name,
           'renewal'::text AS kind
         FROM audit_logs al
         INNER JOIN clients c ON c.id = (al.after_state->>'clientId')::uuid
         WHERE al.entity_type = 'credit_renew'
           AND al.actor_id = $1
           AND ${renewalOnDate}
           ${renewalRouteFilter}
         UNION ALL
         SELECT
           al.id,
           al.created_at,
           (al.after_state->>'loanAmount')::text AS amount,
           c.code AS client_code,
           TRIM(c.first_name || ' ' || c.last_name) AS client_name,
           'onboard'::text AS kind
         FROM audit_logs al
         INNER JOIN clients c ON c.id = (al.after_state->>'clientId')::uuid
         WHERE al.entity_type = 'client_onboard'
           AND al.actor_id = $1
           AND ${renewalOnDate}
           ${onboardRouteFilter}
       ) disbursements
       ORDER BY created_at ASC`,
      params,
    );
  }

  async getOfficeExpensesForDay(
    collectorId: string,
    date: string,
  ): Promise<CashBoxExpenseRow[]> {
    return this.dataSource.query(
      `SELECT e.id, e.amount::text, e.description, e.expense_date::text, e.route_id,
              COALESCE(e.category::text, 'office') AS category,
              e.created_at,
              r.name AS route_name
       FROM cash_box_expenses e
       LEFT JOIN routes r ON r.id = e.route_id
       WHERE e.collector_id = $1
         AND e.expense_date = $2::date
         AND e.category IN ('office', 'route')
       ORDER BY e.created_at ASC`,
      [collectorId, date],
    );
  }

  async getExpensesForRange(
    collectorId: string,
    from: string,
    to: string,
    routeId?: string,
  ): Promise<CashBoxExpenseRow[]> {
    const routeFilter = routeId ? `AND route_id = $4` : "";
    const params = routeId
      ? [collectorId, from, to, routeId]
      : [collectorId, from, to];

    return this.dataSource.query(
      `SELECT e.id, e.amount::text, e.description, e.expense_date::text, e.route_id,
              COALESCE(e.category::text, 'office') AS category,
              e.created_at,
              r.name AS route_name
       FROM cash_box_expenses e
       LEFT JOIN routes r ON r.id = e.route_id
       WHERE e.collector_id = $1
         AND e.expense_date BETWEEN $2::date AND $3::date
         ${routeFilter}
       ORDER BY e.created_at ASC`,
      params,
    );
  }

  async createExpenseReceipt(data: {
    expenseId: string;
    storageKey: string;
    mimeType: string;
    originalFileName?: string | null;
  }): Promise<CashBoxExpenseReceipt> {
    const receipt = this.expenseReceiptRepository.create({
      expenseId: data.expenseId,
      storageKey: data.storageKey,
      mimeType: data.mimeType,
      originalFileName: data.originalFileName ?? null,
    });
    return this.expenseReceiptRepository.save(receipt);
  }

  async listReceiptsForExpenseIds(
    expenseIds: string[],
  ): Promise<CashBoxExpenseReceiptRow[]> {
    if (expenseIds.length === 0) return [];
    return this.dataSource.query(
      `SELECT id, expense_id, storage_key, mime_type, original_file_name, created_at
       FROM cash_box_expense_receipts
       WHERE expense_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [expenseIds],
    );
  }

  async findReceiptById(id: string): Promise<CashBoxExpenseReceipt | null> {
    return this.expenseReceiptRepository.findOne({ where: { id } });
  }

  async deleteReceiptsForExpense(expenseId: string): Promise<void> {
    await this.expenseReceiptRepository.delete({ expenseId });
  }

  async createExpense(data: {
    collectorId: string;
    expenseDate: string;
    amount: number;
    description: string;
    createdById: string;
    routeId?: string | null;
    category?: "route" | "office";
  }): Promise<CashBoxExpense> {
    const expense = this.expenseRepository.create({
      collectorId: data.collectorId,
      expenseDate: data.expenseDate,
      amount: data.amount.toFixed(2),
      description: data.description.trim(),
      createdById: data.createdById,
      routeId: data.routeId ?? null,
      category: data.category ?? "office",
    });
    return this.expenseRepository.save(expense);
  }

  async findExpenseById(id: string): Promise<CashBoxExpense | null> {
    return this.expenseRepository.findOne({ where: { id } });
  }

  async deleteExpense(id: string): Promise<void> {
    await this.expenseRepository.delete({ id });
  }

  async getNetBeforeDate(
    collectorId: string,
    fromDate: string,
    routeId?: string,
    periodStart?: string | null,
  ): Promise<number> {
    const paymentRouteFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = p.client_id AND rca.route_id = $3
         )`
      : "";
    const renewalRouteFilter = routeId
      ? `AND EXISTS (
           SELECT 1 FROM route_client_assignments rca
           WHERE rca.client_id = (al.after_state->>'clientId')::uuid
             AND rca.route_id = $3
         )`
      : "";
    const onboardRouteFilter = routeId
      ? `AND (al.after_state->>'routeId')::uuid = $3`
      : "";
    const expenseRouteFilter = routeId ? `AND e.route_id = $3` : "";
    const payDay = this.paymentBusinessDate("p.captured_at");
    const renewalDay = this.paymentBusinessDate("al.created_at");
    const periodFrom = periodStart ?? "1900-01-01";
    const params = routeId
      ? [collectorId, fromDate, routeId, periodFrom]
      : [collectorId, fromDate, periodFrom];
    const periodParam = routeId ? "$4" : "$3";

    const rows = await this.dataSource.query(
      `SELECT
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p
          WHERE p.collector_id = $1
            AND p.status = 'completed'
            AND ${payDay} >= ${periodParam}::date
            AND ${payDay} < $2::date
            ${paymentRouteFilter}
        )
        -
        (
          SELECT COALESCE(SUM(loan_out.total), 0)
          FROM (
            SELECT (al.after_state->>'renewalAmount')::numeric AS total
            FROM audit_logs al
            WHERE al.entity_type = 'credit_renew'
              AND al.actor_id = $1
              AND ${renewalDay} >= ${periodParam}::date
              AND ${renewalDay} < $2::date
              ${renewalRouteFilter}
            UNION ALL
            SELECT (al.after_state->>'loanAmount')::numeric AS total
            FROM audit_logs al
            WHERE al.entity_type = 'client_onboard'
              AND al.actor_id = $1
              AND ${renewalDay} >= ${periodParam}::date
              AND ${renewalDay} < $2::date
              ${onboardRouteFilter}
          ) loan_out
        )
        -
        (
          SELECT COALESCE(SUM(e.amount), 0)
          FROM cash_box_expenses e
          WHERE e.collector_id = $1
            AND e.expense_date >= ${periodParam}::date
            AND e.expense_date < $2::date
            ${expenseRouteFilter}
        ) AS net_before`,
      params,
    );
    return Number(rows[0]?.net_before ?? 0);
  }

  async getInitialBalance(collectorId: string): Promise<number> {
    const row = await this.initialBalanceRepository.findOne({
      where: { collectorId },
    });
    return row ? Number(row.amount) : 0;
  }

  async findInitialBalanceRecord(
    collectorId: string,
  ): Promise<CashBoxInitialBalance | null> {
    return this.initialBalanceRepository.findOne({ where: { collectorId } });
  }

  async upsertInitialBalance(data: {
    collectorId: string;
    amount: number;
    notes?: string | null;
    setById: string;
  }): Promise<CashBoxInitialBalance> {
    const existing = await this.findInitialBalanceRecord(data.collectorId);
    if (existing) {
      existing.amount = data.amount.toFixed(2);
      existing.notes = data.notes?.trim() ?? null;
      existing.setById = data.setById;
      return this.initialBalanceRepository.save(existing);
    }
    const created = this.initialBalanceRepository.create({
      collectorId: data.collectorId,
      amount: data.amount.toFixed(2),
      notes: data.notes?.trim() ?? null,
      setById: data.setById,
    });
    return this.initialBalanceRepository.save(created);
  }

  async getPeriodStart(collectorId: string): Promise<string | null> {
    const rows = await this.dataSource.query(
      `SELECT effective_from::text AS effective_from
       FROM cash_box_period_starts
       WHERE collector_id = $1`,
      [collectorId],
    );
    return rows[0]?.effective_from?.slice(0, 10) ?? null;
  }

  async upsertPeriodStart(data: {
    collectorId: string;
    effectiveFrom: string;
    notes?: string | null;
    setById: string;
  }): Promise<{ effectiveFrom: string; notes: string | null }> {
    const rows = await this.dataSource.query(
      `INSERT INTO cash_box_period_starts (
        collector_id, effective_from, notes, set_by, updated_at
      ) VALUES ($1, $2::date, $3, $4, now())
      ON CONFLICT (collector_id)
      DO UPDATE SET
        effective_from = EXCLUDED.effective_from,
        notes = EXCLUDED.notes,
        set_by = EXCLUDED.set_by,
        updated_at = now()
      RETURNING effective_from::text AS effective_from, notes`,
      [
        data.collectorId,
        data.effectiveFrom,
        data.notes?.trim() ?? null,
        data.setById,
      ],
    );
    return {
      effectiveFrom: rows[0].effective_from.slice(0, 10),
      notes: rows[0].notes ?? null,
    };
  }

  async getDailyCollectionsByRoute(
    collectorId: string,
    from: string,
    to: string,
  ): Promise<CashBoxRouteDayAmountRow[]> {
    const payDay = this.paymentBusinessDate("p.captured_at");
    return this.dataSource.query(
      `SELECT ${payDay}::text AS day,
              rca.route_id::text AS route_id,
              COALESCE(SUM(p.amount), 0)::text AS total
       FROM payments p
       INNER JOIN route_client_assignments rca ON rca.client_id = p.client_id
       WHERE p.collector_id = $1
         AND p.status = 'completed'
         AND ${payDay} BETWEEN $2::date AND $3::date
       GROUP BY 1, 2`,
      [collectorId, from, to],
    );
  }

  async getDailyRenewalsByRoute(
    collectorId: string,
    from: string,
    to: string,
  ): Promise<CashBoxRouteDayAmountRow[]> {
    const businessDay = this.paymentBusinessDate("al.created_at");
    return this.dataSource.query(
      `SELECT day, route_id, COALESCE(SUM(total), 0)::text AS total
       FROM (
         SELECT ${businessDay}::text AS day,
                rca.route_id::text AS route_id,
                (al.after_state->>'renewalAmount')::numeric AS total
         FROM audit_logs al
         INNER JOIN clients c ON c.id = (al.after_state->>'clientId')::uuid
         INNER JOIN route_client_assignments rca ON rca.client_id = c.id
         WHERE al.entity_type = 'credit_renew'
           AND al.actor_id = $1
           AND ${businessDay} BETWEEN $2::date AND $3::date
         UNION ALL
         SELECT ${businessDay}::text AS day,
                (al.after_state->>'routeId')::text AS route_id,
                (al.after_state->>'loanAmount')::numeric AS total
         FROM audit_logs al
         WHERE al.entity_type = 'client_onboard'
           AND al.actor_id = $1
           AND ${businessDay} BETWEEN $2::date AND $3::date
           AND al.after_state->>'routeId' IS NOT NULL
       ) disbursements
       GROUP BY 1, 2`,
      [collectorId, from, to],
    );
  }

  async getDailyRouteExpensesByRoute(
    collectorId: string,
    from: string,
    to: string,
  ): Promise<CashBoxRouteDayAmountRow[]> {
    return this.dataSource.query(
      `SELECT e.expense_date::text AS day,
              e.route_id::text AS route_id,
              COALESCE(SUM(e.amount), 0)::text AS total
       FROM cash_box_expenses e
       WHERE e.collector_id = $1
         AND e.expense_date BETWEEN $2::date AND $3::date
         AND e.category = 'route'
         AND e.route_id IS NOT NULL
       GROUP BY 1, 2`,
      [collectorId, from, to],
    );
  }

  async getDailyOfficeExpenses(
    collectorId: string,
    from: string,
    to: string,
  ): Promise<CashBoxOfficeDayRow[]> {
    return this.dataSource.query(
      `SELECT e.expense_date::text AS day,
              COALESCE(SUM(e.amount), 0)::text AS total,
              string_agg(e.description, ' / ' ORDER BY e.created_at) AS descriptions
       FROM cash_box_expenses e
       WHERE e.collector_id = $1
         AND e.expense_date BETWEEN $2::date AND $3::date
         AND e.category IN ('office', 'route')
       GROUP BY 1`,
      [collectorId, from, to],
    );
  }

  async getNonWorkingDaysInRange(
    from: string,
    to: string,
  ): Promise<Array<{ day_date: string; label: string | null }>> {
    return this.dataSource.query(
      `SELECT day_date::text AS day_date, label
       FROM non_working_days
       WHERE day_date BETWEEN $1::date AND $2::date
       ORDER BY day_date ASC`,
      [from, to],
    );
  }
}
