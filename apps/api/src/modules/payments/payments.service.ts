import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PaymentsRepository } from "./repositories/payments.repository";
import { ClientsRepository } from "../clients/repositories/clients.repository";
import { RulesService } from "../rules/rules.service";
import {
  ApiErrorCode,
  UserRoleCode,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
  ReversePaymentDto,
} from "./dto/payments.dto";
import { buildPaginationMeta, parsePagination } from "../../common/pagination";
import { isAdminRole } from "../clients/domain/client.types";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly rulesService: RulesService,
  ) {}

  async create(
    user: JwtPayload,
    dto: CreatePaymentDto,
    idempotencyKey: string | undefined,
    deviceId?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "El header Idempotency-Key es obligatorio",
      });
    }

    if (user.role !== UserRoleCode.COLLECTOR) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo cobradores pueden registrar pagos",
      });
    }

    const allowed = await this.clientsRepository.canAccessClient(dto.clientId, {
      userId: user.sub,
      role: user.role,
    });
    if (!allowed) {
      throw new ForbiddenException({
        code: ApiErrorCode.CLIENT_ACCESS_DENIED,
        message: "No tienes acceso a este cliente",
      });
    }

    const capturedAt = new Date(dto.capturedAt);
    const maxAllowed = Date.now() + 5 * 60 * 1000;
    if (capturedAt.getTime() > maxAllowed) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "La fecha de captura no puede estar en el futuro",
      });
    }

    const requestHash = PaymentsRepository.hashRequestBody({
      clientId: dto.clientId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes ?? null,
      capturedAt: dto.capturedAt,
      location: dto.location ?? null,
      installmentIds: dto.installmentIds ?? [],
    });

    const cached = await this.paymentsRepository.findIdempotencyRecord(
      user.sub,
      idempotencyKey,
    );
    if (cached) {
      if (cached.requestHash !== requestHash) {
        throw new ConflictException({
          code: ApiErrorCode.PAYMENT_IDEMPOTENCY_CONFLICT,
          message:
            "La clave de idempotencia ya fue usada con un payload diferente",
        });
      }
      return {
        body: cached.responseBody,
        httpStatus: cached.responseStatus,
      };
    }

    try {
      const result = await this.paymentsRepository.createPayment({
        clientId: dto.clientId,
        collectorId: user.sub,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        idempotencyKey,
        requestHash,
        notes: dto.notes,
        capturedAt,
        deviceId,
        location: dto.location,
        installmentIds: dto.installmentIds,
      });

      void this.rulesService
        .evaluateActiveRulesForClient(dto.clientId)
        .catch(() => undefined);

      return {
        body: {
          id: result.paymentId,
          clientId: result.clientId,
          amount: result.amount,
          status: result.status,
          allocations: result.allocations.map((item) => ({
            installmentId: item.installmentId,
            installmentNumber: item.installmentNumber,
            amount: item.amount,
          })),
          clientVisitStatus: result.clientVisitStatus,
          receipt: result.receipt,
        },
        httpStatus: result.httpStatus,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PAYMENT_IDEMPOTENCY_CONFLICT") {
          throw new ConflictException({
            code: ApiErrorCode.PAYMENT_IDEMPOTENCY_CONFLICT,
            message:
              "La clave de idempotencia ya fue usada con un payload diferente",
          });
        }
        if (error.message === "PAYMENT_NO_ALLOCATION") {
          throw new BadRequestException({
            code: ApiErrorCode.PAYMENT_INVALID_AMOUNT,
            message: "No hay cuotas pendientes para aplicar este pago",
          });
        }
      }
      throw error;
    }
  }

  async getById(user: JwtPayload, paymentId: string) {
    const payment = await this.paymentsRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException({
        code: ApiErrorCode.PAYMENT_NOT_FOUND,
        message: "Pago no encontrado",
      });
    }

    if (!isAdminRole(user.role)) {
      const allowed = await this.clientsRepository.canAccessClient(
        payment.client_id,
        { userId: user.sub, role: user.role },
      );
      if (!allowed || payment.collector_id !== user.sub) {
        throw new ForbiddenException({
          code: ApiErrorCode.FORBIDDEN,
          message: "No tienes acceso a este pago",
        });
      }
    }

    const allocations = await this.paymentsRepository.findPaymentAllocations(
      paymentId,
    );

    return {
      id: payment.id,
      clientId: payment.client_id,
      collectorId: payment.collector_id,
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      status: payment.status,
      notes: payment.notes,
      capturedAt: payment.captured_at,
      recordedAt: payment.recorded_at,
      reversedAt: payment.reversed_at,
      reversalReason: payment.reversal_reason,
      allocations: allocations.map((row: Record<string, unknown>) => ({
        id: row.id,
        installmentId: row.installment_id,
        installmentNumber: row.installment_number,
        amount: Number(row.amount),
      })),
    };
  }

  async listAdmin(user: JwtPayload, query: ListPaymentsQueryDto) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo administradores pueden listar todos los pagos",
      });
    }

    const { page, limit } = parsePagination(query.page, query.limit);
    const { rows, total } = await this.paymentsRepository.listPayments({
      page,
      limit,
      clientId: query.clientId,
      collectorId: query.collectorId,
      status: query.status,
      from: query.from,
      to: query.to,
    });

    return {
      data: rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        clientId: row.client_id,
        collectorId: row.collector_id,
        amount: Number(row.amount),
        paymentMethod: row.payment_method,
        status: row.status,
        capturedAt: row.captured_at,
        recordedAt: row.recorded_at,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async reverse(
    user: JwtPayload,
    paymentId: string,
    dto: ReversePaymentDto,
    ipAddress?: string,
  ) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo administradores pueden reversar pagos",
      });
    }

    try {
      await this.paymentsRepository.reversePayment(
        paymentId,
        user.sub,
        dto.reason,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PAYMENT_NOT_FOUND") {
          throw new NotFoundException({
            code: ApiErrorCode.PAYMENT_NOT_FOUND,
            message: "Pago no encontrado",
          });
        }
        if (error.message === "PAYMENT_NOT_REVERSIBLE") {
          throw new BadRequestException({
            code: ApiErrorCode.VALIDATION_ERROR,
            message: "Este pago no puede ser reversado",
          });
        }
      }
      throw error;
    }

    return {
      message: "Pago reversado correctamente",
      paymentId,
      ipAddress: ipAddress ?? null,
    };
  }
}
