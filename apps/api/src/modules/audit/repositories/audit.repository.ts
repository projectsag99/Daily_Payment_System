import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../entities/audit-log.entity";
import { AuditAction } from "../../../common/constants";

@Injectable()
export class AuditRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async queryLogs(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }): Promise<{ rows: AuditLog[]; total: number }> {
    const qb = this.auditRepository.createQueryBuilder("audit");

    if (filters.entityType) {
      qb.andWhere("audit.entity_type = :entityType", {
        entityType: filters.entityType,
      });
    }
    if (filters.entityId) {
      qb.andWhere("audit.entity_id = :entityId", {
        entityId: filters.entityId,
      });
    }
    if (filters.actorId) {
      qb.andWhere("audit.actor_id = :actorId", { actorId: filters.actorId });
    }
    if (filters.action) {
      qb.andWhere("audit.action = :action", { action: filters.action });
    }
    if (filters.from) {
      qb.andWhere("audit.created_at >= :from", { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere("audit.created_at <= :to", { to: filters.to });
    }

    qb.orderBy("audit.created_at", "DESC");
    qb.skip((filters.page - 1) * filters.limit).take(filters.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
