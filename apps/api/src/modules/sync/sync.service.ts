import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import {
  ApiErrorCode,
  UserRoleCode,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { SyncRepository } from "./repositories/sync.repository";
import { SyncEventsDto, SyncEventItemDto } from "./dto/sync.dto";
import { PaymentsService } from "../payments/payments.service";
import { SyncEventStatus } from "./entities/sync-event.entity";
import {
  SYNC_EVENT_PAYMENT_CREATE,
  buildSyncIdempotencyKey,
  hashSyncPayload,
} from "./domain/sync-event-hash";

export interface SyncEventResult {
  clientEventId: string;
  status: "success" | "already_applied" | "conflict" | "error";
  entityId?: string;
  payment?: Record<string, unknown>;
  errorCode?: string;
  message?: string;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly syncRepository: SyncRepository,
    private readonly paymentsService: PaymentsService,
  ) {}

  async processEvents(user: JwtPayload, dto: SyncEventsDto) {
    this.assertCollector(user);

    const results: SyncEventResult[] = [];
    for (const event of dto.events) {
      results.push(await this.processEvent(user, dto.deviceId, event));
    }

    return { results };
  }

  async getStatus(user: JwtPayload, deviceId?: string) {
    this.assertCollector(user);

    const recentCount = deviceId
      ? await this.syncRepository.countRecentEvents(deviceId)
      : 0;

    return {
      status: "ok",
      serverTime: new Date().toISOString(),
      syncEnabled: true,
      recentEvents: recentCount,
    };
  }

  private async processEvent(
    user: JwtPayload,
    deviceId: string,
    event: SyncEventItemDto,
  ): Promise<SyncEventResult> {
    const payload = {
      ...event.payload,
      capturedAt: event.payload.capturedAt ?? event.capturedAt,
    };
    const payloadHash = hashSyncPayload(payload);
    const existing = await this.syncRepository.findByDeviceEvent(
      deviceId,
      event.clientEventId,
    );

    if (existing) {
      if (existing.payload_hash !== payloadHash) {
        return {
          clientEventId: event.clientEventId,
          status: "conflict",
          errorCode: ApiErrorCode.SYNC_EVENT_CONFLICT,
          message: "El evento ya fue registrado con un payload diferente",
        };
      }

      if (
        existing.status === SyncEventStatus.SUCCESS ||
        existing.status === SyncEventStatus.ALREADY_APPLIED
      ) {
        return this.buildSuccessResult(
          user,
          event.clientEventId,
          existing.result_entity_id,
          "already_applied",
        );
      }
    }

    if (event.eventType !== SYNC_EVENT_PAYMENT_CREATE) {
      await this.syncRepository.insertEvent({
        deviceId,
        clientEventId: event.clientEventId,
        eventType: event.eventType,
        payloadHash,
        status: SyncEventStatus.ERROR,
        errorCode: ApiErrorCode.SYNC_UNSUPPORTED_EVENT_TYPE,
      });

      return {
        clientEventId: event.clientEventId,
        status: "error",
        errorCode: ApiErrorCode.SYNC_UNSUPPORTED_EVENT_TYPE,
        message: "Tipo de evento no soportado",
      };
    }

    const idempotencyKey = buildSyncIdempotencyKey(deviceId, event.clientEventId);

    try {
      const { body } = await this.paymentsService.create(
        user,
        payload,
        idempotencyKey,
        deviceId,
      );

      const inserted = await this.syncRepository.insertEvent({
        deviceId,
        clientEventId: event.clientEventId,
        eventType: event.eventType,
        payloadHash,
        status: SyncEventStatus.SUCCESS,
        resultEntityId: body.id as string,
      });

      if (!inserted) {
        const replay = await this.syncRepository.findByDeviceEvent(
          deviceId,
          event.clientEventId,
        );
        return this.buildSuccessResult(
          user,
          event.clientEventId,
          replay?.result_entity_id ?? (body.id as string),
          "already_applied",
        );
      }

      return {
        clientEventId: event.clientEventId,
        status: "success",
        entityId: body.id as string,
        payment: body as Record<string, unknown>,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        const response = error.getResponse() as { code?: string };
        if (response.code === ApiErrorCode.PAYMENT_IDEMPOTENCY_CONFLICT) {
          return {
            clientEventId: event.clientEventId,
            status: "conflict",
            errorCode: ApiErrorCode.SYNC_EVENT_CONFLICT,
            message: "Conflicto de idempotencia en el pago",
          };
        }
      }

      const errorCode =
        error instanceof BadRequestException
          ? ApiErrorCode.VALIDATION_ERROR
          : ApiErrorCode.SYNC_EVENT_ERROR;

      await this.syncRepository.insertEvent({
        deviceId,
        clientEventId: event.clientEventId,
        eventType: event.eventType,
        payloadHash,
        status: SyncEventStatus.ERROR,
        errorCode,
      });

      const message =
        error instanceof Error ? error.message : "Error al procesar evento";

      return {
        clientEventId: event.clientEventId,
        status: "error",
        errorCode,
        message,
      };
    }
  }

  private async buildSuccessResult(
    user: JwtPayload,
    clientEventId: string,
    paymentId: string | null | undefined,
    status: "success" | "already_applied",
  ): Promise<SyncEventResult> {
    if (!paymentId) {
      return {
        clientEventId,
        status,
      };
    }

    const payment = await this.paymentsService.getById(user, paymentId);

    return {
      clientEventId,
      status,
      entityId: paymentId,
      payment: payment as Record<string, unknown>,
    };
  }

  private assertCollector(user: JwtPayload): void {
    if (user.role !== UserRoleCode.COLLECTOR) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo cobradores pueden sincronizar eventos",
      });
    }
  }
}
