import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RoutesRepository } from "./repositories/routes.repository";
import { AuditService } from "../audit/audit.service";
import {
  ApiErrorCode,
  AuditAction,
  ShiftType,
  UserRoleCode,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { todayInTimezone } from "../clients/domain/client.types";
import {
  AssignCollectorDto,
  CreateRouteDto,
  ListRoutesQueryDto,
  MyRoutesQueryDto,
  ReplaceRouteClientsDto,
  RouteClientsQueryDto,
  UpdateRouteDto,
} from "./dto/routes.dto";
import {
  mapRouteClient,
  mapRouteSummary,
  mapRouteWithClients,
} from "./domain/route.mapper";
import {
  isValidRouteCity,
  isValidRouteCountryCode,
} from "./domain/route-locations";

@Injectable()
export class RoutesService {
  private readonly timezone: string;

  constructor(
    private readonly routesRepository: RoutesRepository,
    private readonly auditService: AuditService,
    configService: ConfigService,
  ) {
    this.timezone = configService.get<string>("timezone", "America/Bogota");
  }

  private resolveVisitDate(date?: string): string {
    return date ?? todayInTimezone(this.timezone);
  }

  private assertAdmin(user: JwtPayload): void {
    if (user.role !== UserRoleCode.ADMIN) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo administradores pueden realizar esta acción",
      });
    }
  }

  private async assertRouteExists(routeId: string) {
    const route = await this.routesRepository.findById(routeId);
    if (!route || route.deletedAt) {
      throw new NotFoundException({
        code: ApiErrorCode.ROUTE_NOT_FOUND,
        message: "Ruta no encontrada",
      });
    }
    return route;
  }

  private async assertRouteAccess(
    user: JwtPayload,
    routeId: string,
    visitDate: string,
  ): Promise<void> {
    if (user.role === UserRoleCode.ADMIN) {
      await this.assertRouteExists(routeId);
      return;
    }

    const allowed = await this.routesRepository.canCollectorAccessRoute(
      routeId,
      user.sub,
      visitDate,
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: ApiErrorCode.ROUTE_ACCESS_DENIED,
        message: "No tienes acceso a esta ruta",
      });
    }
  }

  async listAdmin(user: JwtPayload, query: ListRoutesQueryDto) {
    this.assertAdmin(user);
    const rows = await this.routesRepository.findAllAdmin({
      shift: query.shift,
      isActive: query.isActive,
    });
    return rows.map(mapRouteSummary);
  }

  private assertValidRouteLocation(country: string, city: string): void {
    if (!isValidRouteCountryCode(country)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "País no válido",
      });
    }
    if (!isValidRouteCity(country, city)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Ciudad no válida para el país seleccionado",
      });
    }
  }

  async create(user: JwtPayload, dto: CreateRouteDto, ipAddress?: string) {
    this.assertAdmin(user);
    this.assertValidRouteLocation(dto.country, dto.city);

    const route = await this.routesRepository.createRoute({
      name: dto.name,
      shift: dto.shift ?? ShiftType.MORNING,
      dayOfWeek: dto.dayOfWeek ?? null,
      description: dto.description,
      country: dto.country,
      city: dto.city,
    });

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.CREATE,
      entityType: "route",
      entityId: route.id,
      afterState: {
        name: route.name,
        shift: route.shift,
        country: route.country,
        city: route.city,
      },
      ipAddress: ipAddress ?? null,
    });

    if (dto.collectorId) {
      await this.assignCollector(
        user,
        route.id,
        {
          collectorId: dto.collectorId,
          effectiveFrom: todayInTimezone(this.timezone),
        },
        ipAddress,
      );
    }

    const rows = await this.routesRepository.findAllAdmin({});
    const row = rows.find((r) => r.id === route.id);
    if (row) {
      return mapRouteSummary(row);
    }

    return mapRouteSummary({
      id: route.id,
      name: route.name,
      shift: route.shift,
      day_of_week: route.dayOfWeek,
      is_active: route.isActive,
      description: route.description,
      country: route.country,
      city: route.city,
      client_count: "0",
      collector_id: null,
      collector_name: null,
      collected_today_pct: null,
      created_at: route.createdAt,
      updated_at: route.updatedAt,
    });
  }

  async update(
    user: JwtPayload,
    routeId: string,
    dto: UpdateRouteDto,
    ipAddress?: string,
  ) {
    this.assertAdmin(user);
    const before = await this.assertRouteExists(routeId);

    if (dto.country !== undefined || dto.city !== undefined) {
      const country = dto.country ?? before.country;
      const city = dto.city ?? before.city;
      if (!country || !city) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "País y ciudad son obligatorios",
        });
      }
      this.assertValidRouteLocation(country, city);
    }

    const patch: Parameters<RoutesRepository["updateRoute"]>[1] = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.shift !== undefined) patch.shift = dto.shift;
    if (dto.dayOfWeek !== undefined) patch.dayOfWeek = dto.dayOfWeek;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.country !== undefined) patch.country = dto.country;
    if (dto.city !== undefined) patch.city = dto.city;

    const updated = await this.routesRepository.updateRoute(routeId, patch);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "route",
      entityId: routeId,
      beforeState: { name: before.name, isActive: before.isActive },
      afterState: { name: updated?.name, isActive: updated?.isActive },
      ipAddress: ipAddress ?? null,
    });

    const rows = await this.routesRepository.findAllAdmin({});
    const row = rows.find((r) => r.id === routeId);
    return row ? mapRouteSummary(row) : { id: routeId, ...dto };
  }

  async remove(user: JwtPayload, routeId: string, ipAddress?: string) {
    this.assertAdmin(user);
    const before = await this.assertRouteExists(routeId);

    await this.routesRepository.softDeleteRoute(routeId);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.SOFT_DELETE,
      entityType: "route",
      entityId: routeId,
      beforeState: { name: before.name },
      ipAddress: ipAddress ?? null,
    });

    return { message: "Ruta eliminada correctamente" };
  }

  async myRoutes(user: JwtPayload, query: MyRoutesQueryDto) {
    const visitDate = this.resolveVisitDate(query.date);
    const routeRows = await this.routesRepository.findCollectorRoutes(
      user.sub,
      visitDate,
      query.shift,
    );

    const routes = await Promise.all(
      routeRows.map(async (row) => {
        const clients = await this.routesRepository.findRouteClients(
          row.id,
          visitDate,
        );
        return mapRouteWithClients(mapRouteSummary(row), clients);
      }),
    );

    return { routes };
  }

  async getRouteClients(
    user: JwtPayload,
    routeId: string,
    query: RouteClientsQueryDto,
  ) {
    const visitDate = this.resolveVisitDate(query.date);
    await this.assertRouteAccess(user, routeId, visitDate);

    const clients = await this.routesRepository.findRouteClients(
      routeId,
      visitDate,
    );
    return clients.map(mapRouteClient);
  }

  async replaceRouteClients(
    user: JwtPayload,
    routeId: string,
    dto: ReplaceRouteClientsDto,
    ipAddress?: string,
  ) {
    this.assertAdmin(user);
    await this.assertRouteExists(routeId);

    const uniqueIds = [...new Set(dto.clientIds)];
    if (uniqueIds.length !== dto.clientIds.length) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "La lista de clientes contiene duplicados",
      });
    }

    const validIds = await this.routesRepository.validateClientIds(uniqueIds);
    if (validIds.length !== uniqueIds.length) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Uno o más clientes no existen o están eliminados",
      });
    }

    await this.routesRepository.replaceRouteClients(routeId, uniqueIds);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "route",
      entityId: routeId,
      afterState: { clientIds: uniqueIds, clientCount: uniqueIds.length },
      metadata: { action: "replace_client_assignments" },
      ipAddress: ipAddress ?? null,
    });

    const visitDate = todayInTimezone(this.timezone);
    const clients = await this.routesRepository.findRouteClients(
      routeId,
      visitDate,
    );
    return clients.map(mapRouteClient);
  }

  async assignCollector(
    user: JwtPayload,
    routeId: string,
    dto: AssignCollectorDto,
    ipAddress?: string,
  ) {
    this.assertAdmin(user);
    await this.assertRouteExists(routeId);

    const collectorValid = await this.routesRepository.validateCollectorId(
      dto.collectorId,
    );
    if (!collectorValid) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "El cobrador no existe o no puede asignarse a una ruta",
      });
    }

    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "La fecha de fin debe ser posterior a la de inicio",
      });
    }

    const assignment = await this.routesRepository.assignCollector({
      routeId,
      collectorId: dto.collectorId,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
    });

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "route_collector_assignment",
      entityId: assignment.id,
      afterState: {
        routeId,
        collectorId: dto.collectorId,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo ?? null,
      },
      ipAddress: ipAddress ?? null,
    });

    return {
      id: assignment.id,
      routeId: assignment.routeId,
      collectorId: assignment.collectorId,
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo,
      createdAt: assignment.createdAt,
    };
  }

  async removeCollectorAssignment(
    user: JwtPayload,
    routeId: string,
    assignmentId: string,
    ipAddress?: string,
  ) {
    this.assertAdmin(user);
    await this.assertRouteExists(routeId);

    const assignment = await this.routesRepository.findCollectorAssignment(
      assignmentId,
      routeId,
    );
    if (!assignment) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: "Asignación de cobrador no encontrada",
      });
    }

    await this.routesRepository.removeCollectorAssignment(assignmentId);

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.DELETE,
      entityType: "route_collector_assignment",
      entityId: assignmentId,
      beforeState: {
        routeId,
        collectorId: assignment.collectorId,
      },
      ipAddress: ipAddress ?? null,
    });

    return { message: "Asignación de cobrador eliminada correctamente" };
  }

  async listCollectorAssignments(user: JwtPayload, routeId: string) {
    this.assertAdmin(user);
    await this.assertRouteExists(routeId);
    const rows = await this.routesRepository.listCollectorAssignments(routeId);
    return rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      collectorId: row.collector_id,
      collectorName: row.collector_name,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      createdAt: row.created_at,
    }));
  }
}
