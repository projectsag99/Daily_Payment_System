import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RulesRepository } from "./repositories/rules.repository";
import {
  CreateRuleDto,
  EvaluateRuleDto,
  UpdateRuleDto,
} from "./dto/rules.dto";
import {
  ApiErrorCode,
  AuditAction,
  NotificationChannel,
  RuleType,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  buildRuleNotificationContent,
  evaluateRuleMatch,
  normalizeRuleConfig,
} from "./domain/rule-evaluator";
import { todayInTimezone } from "../clients/domain/client.types";

@Injectable()
export class RulesService {
  private readonly timezone: string;

  constructor(
    private readonly rulesRepository: RulesRepository,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.timezone = this.configService.get<string>("timezone", "America/Bogota");
  }

  async list() {
    const rows = await this.rulesRepository.listActive();
    return rows.map((row) => this.mapRule(row));
  }

  async create(user: JwtPayload, dto: CreateRuleDto, ipAddress?: string) {
    this.validateConfig(dto.ruleType, dto.config);

    const row = await this.rulesRepository.create({
      name: dto.name,
      ruleType: dto.ruleType,
      config: dto.config,
      notifyChannel: dto.notifyChannel ?? NotificationChannel.PUSH,
      cooldownHours: dto.cooldownHours ?? 24,
      isActive: dto.isActive ?? true,
      createdById: user.sub,
    });

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.CREATE,
      entityType: "business_rule",
      entityId: row.id,
      afterState: this.mapRule(row),
      ipAddress: ipAddress ?? null,
    });

    return this.mapRule(row);
  }

  async update(
    user: JwtPayload,
    ruleId: string,
    dto: UpdateRuleDto,
    ipAddress?: string,
  ) {
    const existing = await this.rulesRepository.findById(ruleId);
    if (!existing) {
      throw new NotFoundException({
        code: ApiErrorCode.RULE_NOT_FOUND,
        message: "Regla no encontrada",
      });
    }

    if (dto.config) {
      this.validateConfig(existing.rule_type, dto.config);
    }

    const updated = await this.rulesRepository.update(ruleId, {
      name: dto.name,
      config: dto.config,
      notifyChannel: dto.notifyChannel,
      cooldownHours: dto.cooldownHours,
      isActive: dto.isActive,
    });

    if (!updated) {
      throw new NotFoundException({
        code: ApiErrorCode.RULE_NOT_FOUND,
        message: "Regla no encontrada",
      });
    }

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "business_rule",
      entityId: ruleId,
      beforeState: this.mapRule(existing),
      afterState: this.mapRule(updated),
      ipAddress: ipAddress ?? null,
    });

    return this.mapRule(updated);
  }

  async softDelete(user: JwtPayload, ruleId: string, ipAddress?: string) {
    const existing = await this.rulesRepository.findById(ruleId);
    if (!existing) {
      throw new NotFoundException({
        code: ApiErrorCode.RULE_NOT_FOUND,
        message: "Regla no encontrada",
      });
    }

    await this.rulesRepository.softDelete(ruleId);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: "business_rule",
      entityId: ruleId,
      beforeState: this.mapRule(existing),
      ipAddress: ipAddress ?? null,
    });

    return { message: "Regla eliminada correctamente", ruleId };
  }

  async evaluate(
    user: JwtPayload,
    ruleId: string,
    dto: EvaluateRuleDto,
    ipAddress?: string,
  ) {
    const rule = await this.rulesRepository.findById(ruleId);
    if (!rule) {
      throw new NotFoundException({
        code: ApiErrorCode.RULE_NOT_FOUND,
        message: "Regla no encontrada",
      });
    }

    const result = await this.runEvaluation(rule, dto.clientId);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.RULE_TRIGGER,
      entityType: "business_rule",
      entityId: ruleId,
      metadata: result,
      ipAddress: ipAddress ?? null,
    });

    return {
      ruleId,
      ...result,
    };
  }

  async evaluateActiveRulesForClient(clientId: string): Promise<void> {
    const rules = await this.rulesRepository.listActive();
    for (const rule of rules) {
      if (!rule.is_active) {
        continue;
      }
      await this.runEvaluation(rule, clientId);
    }
  }

  private async runEvaluation(
    rule: NonNullable<Awaited<ReturnType<RulesRepository["findById"]>>>,
    clientId?: string,
  ) {
    const config = normalizeRuleConfig(rule.rule_type, rule.config);
    const clients = await this.rulesRepository.listClientsForEvaluation(clientId);
    const today = todayInTimezone(this.timezone);

    let matchedClients = 0;
    let notificationsCreated = 0;

    for (const client of clients) {
      const metrics = {
        overdueInstallmentCount: Number(client.overdue_installment_count),
        accumulatedUnpaidAmount: Number(client.accumulated_unpaid_amount),
      };

      const matched = evaluateRuleMatch(rule.rule_type, config, metrics);
      const collectors = await this.rulesRepository.findAssignedCollectors(
        client.client_id,
        today,
      );

      if (collectors.length === 0) {
        continue;
      }

      if (!matched || !rule.is_active) {
        for (const collector of collectors) {
          await this.rulesRepository.insertEvaluationLog({
            ruleId: rule.id,
            clientId: client.client_id,
            collectorId: collector.collector_id,
            matched: false,
          });
        }
        continue;
      }

      const inCooldown = await this.rulesRepository.isInCooldown(
        rule.id,
        client.client_id,
        rule.cooldown_hours,
      );

      if (inCooldown) {
        continue;
      }

      matchedClients += 1;
      const content = buildRuleNotificationContent({
        ruleName: rule.name,
        clientCode: client.client_code,
        clientFirstName: client.client_first_name,
        ruleType: rule.rule_type,
        metrics,
      });

      for (const collector of collectors) {
        const notification = await this.notificationsService.createAndEnqueue({
          userId: collector.collector_id,
          title: content.title,
          body: content.body,
          channel: rule.notify_channel as NotificationChannel,
          payload: {
            ruleId: rule.id,
            clientId: client.client_id,
            metrics,
          },
        });

        notificationsCreated += 1;

        await this.rulesRepository.insertEvaluationLog({
          ruleId: rule.id,
          clientId: client.client_id,
          collectorId: collector.collector_id,
          matched: true,
          notificationId: notification.id,
        });
      }
    }

    return {
      evaluatedClients: clients.length,
      matchedClients,
      notificationsCreated,
    };
  }

  private validateConfig(ruleType: RuleType, config: Record<string, unknown>) {
    if (ruleType === RuleType.OVERDUE_INSTALLMENTS_THRESHOLD) {
      const threshold = Number(config.thresholdCount ?? config.threshold_count);
      if (!Number.isFinite(threshold) || threshold < 1) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "config.thresholdCount debe ser un entero mayor o igual a 1",
        });
      }
      return;
    }

    const threshold = Number(config.thresholdAmount ?? config.threshold_amount);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "config.thresholdAmount debe ser mayor a 0",
      });
    }
  }

  private mapRule(row: {
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
  }) {
    return {
      id: row.id,
      name: row.name,
      ruleType: row.rule_type,
      config: row.config,
      isActive: row.is_active,
      notifyChannel: row.notify_channel,
      cooldownHours: row.cooldown_hours,
      createdById: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
