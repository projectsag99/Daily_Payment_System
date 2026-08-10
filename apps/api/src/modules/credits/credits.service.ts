import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { CreditsRepository } from "./repositories/credits.repository";
import { ClientsRepository } from "../clients/repositories/clients.repository";
import { AuditService } from "../audit/audit.service";
import {
  ApiErrorCode,
  AuditAction,
  UserRoleCode,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { CreateCreditDto, RegenerateInstallmentsDto } from "./dto/credits.dto";
import {
  generateDailyInstallmentSchedule,
  roundMoney,
} from "./domain/installment-schedule";
import { isAdminRole } from "../clients/domain/client.types";
import { getCurrencyForCountry } from "../routes/domain/route-currencies";

interface AssignedRouteRow {
  id: string;
  name: string;
  country: string | null;
  department: string | null;
  city: string | null;
  sequence_order: number;
}

@Injectable()
export class CreditsService {
  constructor(
    private readonly creditsRepository: CreditsRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly auditService: AuditService,
  ) {}

  private async assertCreditAccess(user: JwtPayload, creditId: string) {
    const credit = await this.creditsRepository.findById(creditId);
    if (!credit) {
      throw new NotFoundException({
        code: ApiErrorCode.CREDIT_NOT_FOUND,
        message: "Crédito no encontrado",
      });
    }

    if (isAdminRole(user.role)) {
      return credit;
    }

    const allowed = await this.clientsRepository.canAccessClient(credit.clientId, {
      userId: user.sub,
      role: user.role,
    });
    if (!allowed) {
      throw new ForbiddenException({
        code: ApiErrorCode.CLIENT_ACCESS_DENIED,
        message: "No tienes acceso a este crédito",
      });
    }
    return credit;
  }

  async createForClient(
    user: JwtPayload,
    clientId: string,
    dto: CreateCreditDto,
    ipAddress?: string,
  ) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo administradores pueden crear créditos",
      });
    }

    const client = await this.clientsRepository.findById(clientId);
    if (!client) {
      throw new NotFoundException({
        code: ApiErrorCode.CLIENT_NOT_FOUND,
        message: "Cliente no encontrado",
      });
    }

    const assignedRoutes =
      (await this.clientsRepository.findAssignedRoutes(
        clientId,
      )) as AssignedRouteRow[];

    const { routeId, currency } = this.resolveCreditRouteAndCurrency(
      assignedRoutes,
      dto.routeId,
      client.country,
    );

    const schedule = generateDailyInstallmentSchedule(
      dto.startDate,
      dto.totalInstallments,
      dto.installmentAmount,
    );

    const credit = await this.creditsRepository.createCreditWithSchedule({
      clientId,
      routeId,
      currency,
      principalAmount: dto.principalAmount,
      interestRate: dto.interestRate,
      totalInstallments: dto.totalInstallments,
      installmentAmount: dto.installmentAmount,
      startDate: dto.startDate,
      notes: dto.notes,
      createdById: user.sub,
      schedule,
    });

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.CREATE,
      entityType: "credit",
      entityId: credit.id,
      afterState: {
        clientId,
        routeId,
        currency,
        principalAmount: dto.principalAmount,
        totalInstallments: dto.totalInstallments,
      },
      ipAddress: ipAddress ?? null,
    });

    return this.getById(user, credit.id);
  }

  async getById(user: JwtPayload, creditId: string) {
    await this.assertCreditAccess(user, creditId);
    const row = await this.creditsRepository.findByIdWithClient(creditId);
    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.CREDIT_NOT_FOUND,
        message: "Crédito no encontrado",
      });
    }

    const installments = await this.creditsRepository.listInstallments(creditId);
    const paidCount = installments.filter(
      (i: { status: string }) => i.status === "paid",
    ).length;
    const totalPaid = installments.reduce(
      (sum: number, i: { amount_paid: string }) => sum + Number(i.amount_paid),
      0,
    );

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: `${row.first_name} ${row.last_name}`.trim(),
      clientCode: row.client_code,
      routeId: row.route_id,
      routeName: row.route_name ?? null,
      country: row.route_country ?? null,
      currency: row.currency,
      principalAmount: Number(row.principal_amount),
      interestRate: row.interest_rate ? Number(row.interest_rate) : null,
      totalInstallments: row.total_installments,
      installmentAmount: Number(row.installment_amount),
      startDate: row.start_date,
      status: row.status,
      notes: row.notes,
      paidInstallments: paidCount,
      totalPaid: roundMoney(totalPaid),
      balance: roundMoney(Number(row.principal_amount) - totalPaid),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    };
  }

  private resolveCreditRouteAndCurrency(
    assignedRoutes: AssignedRouteRow[],
    requestedRouteId: string | undefined,
    clientCountry: string | null,
  ): { routeId: string | null; currency: string } {
    if (assignedRoutes.length === 0) {
      const currency =
        (clientCountry && getCurrencyForCountry(clientCountry)) || "COP";
      return { routeId: null, currency };
    }

    if (assignedRoutes.length === 1) {
      const route = assignedRoutes[0];
      if (requestedRouteId && requestedRouteId !== route.id) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "La ruta seleccionada no corresponde al cliente",
        });
      }
      const currency = this.currencyForRoute(route);
      return { routeId: route.id, currency };
    }

    if (!requestedRouteId) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message:
          "El cliente está en varias rutas. Selecciona la ruta del crédito.",
      });
    }

    const route = assignedRoutes.find((r) => r.id === requestedRouteId);
    if (!route) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "La ruta seleccionada no corresponde al cliente",
      });
    }

    return { routeId: route.id, currency: this.currencyForRoute(route) };
  }

  private currencyForRoute(route: AssignedRouteRow): string {
    if (route.country) {
      const currency = getCurrencyForCountry(route.country);
      if (currency) {
        return currency;
      }
    }
    return "COP";
  }

  async listInstallments(user: JwtPayload, creditId: string) {
    await this.assertCreditAccess(user, creditId);
    const rows = await this.creditsRepository.listInstallments(creditId);
    return rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      installmentNumber: row.installment_number,
      dueDate: row.due_date,
      amountDue: Number(row.amount_due),
      amountPaid: Number(row.amount_paid),
      status: row.status,
      overdueAt: row.overdue_at,
    }));
  }

  async regenerateInstallments(
    user: JwtPayload,
    creditId: string,
    dto: RegenerateInstallmentsDto,
    ipAddress?: string,
  ) {
    if (user.role !== UserRoleCode.ADMIN) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo administradores pueden regenerar cuotas",
      });
    }

    await this.assertCreditAccess(user, creditId);
    const schedule = generateDailyInstallmentSchedule(
      dto.startDate,
      dto.totalInstallments,
      dto.installmentAmount,
    );

    try {
      await this.creditsRepository.regenerateInstallments(creditId, schedule);
    } catch (error) {
      if (error instanceof Error && error.message === "CREDIT_HAS_PAYMENTS") {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "No se puede regenerar un crédito con pagos aplicados",
        });
      }
      throw error;
    }

    await this.auditService.log({
      actorId: user.sub,
      action: AuditAction.UPDATE,
      entityType: "credit",
      entityId: creditId,
      metadata: { action: "regenerate_installments" },
      ipAddress: ipAddress ?? null,
    });

    return this.listInstallments(user, creditId);
  }
}
