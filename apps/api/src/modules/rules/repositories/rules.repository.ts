import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { BusinessRule } from "../entities/business-rule.entity";
import { RuleType } from "../../../common/constants";

export interface BusinessRuleRow {
  id: string;
  name: string;
  rule_type: RuleType;
  config: Record<string, unknown>;
  is_active: boolean;
  notify_channel: string;
  cooldown_hours: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ClientEvaluationRow {
  client_id: string;
  client_code: string;
  client_first_name: string;
  overdue_installment_count: number;
  accumulated_unpaid_amount: string | number;
}

@Injectable()
export class RulesRepository {
  constructor(
    @InjectRepository(BusinessRule)
    private readonly ruleRepository: Repository<BusinessRule>,
    private readonly dataSource: DataSource,
  ) {}

  async listActive(): Promise<BusinessRuleRow[]> {
    return this.dataSource.query(
      `SELECT *
       FROM business_rules
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`,
    );
  }

  async findById(ruleId: string): Promise<BusinessRuleRow | null> {
    const rows = await this.dataSource.query(
      `SELECT *
       FROM business_rules
       WHERE id = $1 AND deleted_at IS NULL`,
      [ruleId],
    );
    return (rows[0] as BusinessRuleRow | undefined) ?? null;
  }

  async create(input: {
    name: string;
    ruleType: RuleType;
    config: Record<string, unknown>;
    notifyChannel: string;
    cooldownHours: number;
    isActive: boolean;
    createdById: string;
  }): Promise<BusinessRuleRow> {
    const rows = await this.dataSource.query(
      `INSERT INTO business_rules (
        name, rule_type, config, notify_channel, cooldown_hours, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        input.name,
        input.ruleType,
        JSON.stringify(input.config),
        input.notifyChannel,
        input.cooldownHours,
        input.isActive,
        input.createdById,
      ],
    );
    return rows[0] as BusinessRuleRow;
  }

  async update(
    ruleId: string,
    patch: {
      name?: string;
      config?: Record<string, unknown>;
      notifyChannel?: string;
      cooldownHours?: number;
      isActive?: boolean;
    },
  ): Promise<BusinessRuleRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [ruleId];
    let idx = 2;

    if (patch.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(patch.name);
    }
    if (patch.config !== undefined) {
      fields.push(`config = $${idx++}`);
      params.push(JSON.stringify(patch.config));
    }
    if (patch.notifyChannel !== undefined) {
      fields.push(`notify_channel = $${idx++}`);
      params.push(patch.notifyChannel);
    }
    if (patch.cooldownHours !== undefined) {
      fields.push(`cooldown_hours = $${idx++}`);
      params.push(patch.cooldownHours);
    }
    if (patch.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      params.push(patch.isActive);
    }

    if (fields.length === 0) {
      return this.findById(ruleId);
    }

    fields.push("updated_at = now()");
    const rows = await this.dataSource.query(
      `UPDATE business_rules
       SET ${fields.join(", ")}
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      params,
    );
    return (rows[0] as BusinessRuleRow | undefined) ?? null;
  }

  async softDelete(ruleId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `UPDATE business_rules
       SET deleted_at = now(), updated_at = now(), is_active = false
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [ruleId],
    );
    return rows.length > 0;
  }

  async listClientsForEvaluation(clientId?: string): Promise<ClientEvaluationRow[]> {
    const params: unknown[] = [];
    let clientFilter = "";
    if (clientId) {
      clientFilter = "AND c.id = $1";
      params.push(clientId);
    }

    return this.dataSource.query(
      `SELECT
        c.id AS client_id,
        c.code AS client_code,
        c.first_name AS client_first_name,
        COUNT(*) FILTER (
          WHERE i.status IN ('overdue', 'partial', 'pending')
            AND i.due_date < CURRENT_DATE
            AND i.amount_paid < i.amount_due
        )::int AS overdue_installment_count,
        COALESCE(SUM(i.amount_due - i.amount_paid) FILTER (
          WHERE i.status IN ('overdue', 'partial', 'pending')
            AND cr.status = 'active'
        ), 0) AS accumulated_unpaid_amount
      FROM clients c
      INNER JOIN credits cr ON cr.client_id = c.id AND cr.status = 'active'
      INNER JOIN installments i ON i.credit_id = cr.id
      WHERE c.deleted_at IS NULL
        AND c.status = 'active'
        ${clientFilter}
      GROUP BY c.id, c.code, c.first_name`,
      params,
    );
  }

  async findAssignedCollectors(
    clientId: string,
    asOfDate: string,
  ): Promise<Array<{ collector_id: string }>> {
    return this.dataSource.query(
      `SELECT DISTINCT rca.collector_id
       FROM route_collector_assignments rca
       INNER JOIN route_client_assignments rcl ON rcl.route_id = rca.route_id
       INNER JOIN routes r ON r.id = rca.route_id
       WHERE rcl.client_id = $1
         AND r.deleted_at IS NULL
         AND r.is_active = true
         AND rca.effective_from <= $2::date
         AND (rca.effective_to IS NULL OR rca.effective_to >= $2::date)`,
      [clientId, asOfDate],
    );
  }

  async isInCooldown(
    ruleId: string,
    clientId: string,
    cooldownHours: number,
  ): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1
       FROM rule_evaluation_logs
       WHERE rule_id = $1
         AND client_id = $2
         AND matched = true
         AND evaluated_at > now() - ($3::text || ' hours')::interval
       LIMIT 1`,
      [ruleId, clientId, String(cooldownHours)],
    );
    return rows.length > 0;
  }

  async insertEvaluationLog(input: {
    ruleId: string;
    clientId: string;
    collectorId: string;
    matched: boolean;
    notificationId?: string | null;
  }): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO rule_evaluation_logs (
        rule_id, client_id, collector_id, evaluated_at, matched, notification_id
      ) VALUES ($1, $2, $3, now(), $4, $5)`,
      [
        input.ruleId,
        input.clientId,
        input.collectorId,
        input.matched,
        input.notificationId ?? null,
      ],
    );
  }
}
