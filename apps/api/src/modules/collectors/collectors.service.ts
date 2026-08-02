import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { CollectorsRepository } from "./repositories/collectors.repository";
import { RefreshTokenRepository } from "../auth/repositories/refresh-token.repository";
import { AuditService } from "../audit/audit.service";
import {
  ApiErrorCode,
  AuditAction,
  CollectorStatus,
  UserRoleCode,
} from "../../common/constants";
import {
  CollectorTransitionAction,
  getAuditActionForTransition,
  getNextCollectorStatus,
} from "./domain/collector-status.fsm";
import { CollectorProfile } from "./entities/collector-profile.entity";
import {
  ApproveCollectorDto,
  DeactivateCollectorDto,
  RejectCollectorDto,
  SuspendCollectorDto,
} from "./dto/collectors.dto";

@Injectable()
export class CollectorsService {
  constructor(
    private readonly collectorsRepository: CollectorsRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(status?: CollectorStatus) {
    const profiles = await this.collectorsRepository.findAll(status);
    return profiles.map((p) => this.toSummary(p));
  }

  async getById(id: string) {
    const profile = await this.collectorsRepository.findById(id);
    if (!profile) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Cobrador no encontrado",
      });
    }
    return this.toDetail(profile);
  }

  async approve(
    id: string,
    adminId: string,
    dto: ApproveCollectorDto,
    ipAddress?: string,
  ) {
    return this.transition(id, "approve", adminId, ipAddress, (profile) => {
      if (dto.employeeCode) {
        profile.employeeCode = dto.employeeCode;
      }
      if (dto.notes) {
        profile.notes = dto.notes;
      }
      profile.rejectionReason = null;
    });
  }

  async reject(
    id: string,
    adminId: string,
    dto: RejectCollectorDto,
    ipAddress?: string,
  ) {
    return this.transition(id, "reject", adminId, ipAddress, (profile) => {
      profile.rejectionReason = dto.reason;
    });
  }

  async suspend(
    id: string,
    adminId: string,
    dto: SuspendCollectorDto,
    ipAddress?: string,
  ) {
    const result = await this.transition(
      id,
      "suspend",
      adminId,
      ipAddress,
      (profile) => {
        profile.notes = dto.reason;
      },
    );
    await this.refreshTokenRepository.revokeAllForUser(result.userId);
    return result;
  }

  async reactivate(id: string, adminId: string, ipAddress?: string) {
    return this.transition(id, "reactivate", adminId, ipAddress);
  }

  async deactivate(
    id: string,
    adminId: string,
    dto: DeactivateCollectorDto,
    ipAddress?: string,
  ) {
    const result = await this.transition(
      id,
      "deactivate",
      adminId,
      ipAddress,
      (profile) => {
        if (dto.reason) {
          profile.notes = dto.reason;
        }
      },
    );
    await this.refreshTokenRepository.revokeAllForUser(result.userId);
    return result;
  }

  private async transition(
    id: string,
    action: CollectorTransitionAction,
    adminId: string,
    ipAddress?: string,
    mutate?: (profile: CollectorProfile) => void,
  ) {
    const profile = await this.collectorsRepository.findById(id);
    if (!profile) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Cobrador no encontrado",
      });
    }

    const nextStatus = getNextCollectorStatus(profile.status, action);
    if (!nextStatus) {
      throw new UnprocessableEntityException({
        code: ApiErrorCode.INVALID_STATUS_TRANSITION,
        message: `No se puede ${action} un cobrador en estado '${profile.status}'`,
      });
    }

    const beforeState = {
      status: profile.status,
      employeeCode: profile.employeeCode,
      rejectionReason: profile.rejectionReason,
    };

    profile.status = nextStatus;
    profile.statusChangedAt = new Date();
    profile.statusChangedBy = adminId;
    mutate?.(profile);

    const saved = await this.collectorsRepository.save(profile);

    const auditActionName = getAuditActionForTransition(action);
    await this.auditService.log({
      actorId: adminId,
      action: AuditAction[auditActionName],
      entityType: "collector_profile",
      entityId: saved.id,
      beforeState,
      afterState: {
        status: saved.status,
        employeeCode: saved.employeeCode,
        rejectionReason: saved.rejectionReason,
      },
      ipAddress: ipAddress ?? null,
    });

    return this.toDetail(saved);
  }

  private toSummary(profile: CollectorProfile) {
    const user = profile.user;
    return {
      id: profile.id,
      userId: profile.userId,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone,
      status: profile.status,
      employeeCode: profile.employeeCode,
      createdAt: profile.createdAt,
    };
  }

  private toDetail(profile: CollectorProfile) {
    return {
      ...this.toSummary(profile),
      rejectionReason: profile.rejectionReason,
      notes: profile.notes,
      statusChangedAt: profile.statusChangedAt,
      statusChangedBy: profile.statusChangedBy,
    };
  }
}

export function isCollectorRole(role: string): boolean {
  return role === UserRoleCode.COLLECTOR;
}
