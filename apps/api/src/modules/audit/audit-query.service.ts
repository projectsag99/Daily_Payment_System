import { Injectable, ForbiddenException } from "@nestjs/common";
import { AuditRepository } from "./repositories/audit.repository";
import { ListAuditQueryDto } from "./dto/audit.dto";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { ApiErrorCode } from "../../common/constants";
import { isAdminRole } from "../clients/domain/client.types";
import { buildPaginationMeta, parsePagination } from "../../common/pagination";

@Injectable()
export class AuditQueryService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async list(user: JwtPayload, query: ListAuditQueryDto) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo administradores pueden consultar auditoría",
      });
    }

    const { page, limit } = parsePagination(query.page, query.limit);
    const { rows, total } = await this.auditRepository.queryLogs({
      entityType: query.entityType,
      entityId: query.entityId,
      actorId: query.actorId,
      action: query.action,
      from: query.from,
      to: query.to,
      page,
      limit,
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        beforeState: row.beforeState,
        afterState: row.afterState,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
