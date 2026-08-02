import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { NotificationsRepository } from "./repositories/notifications.repository";
import {
  ListNotificationsQueryDto,
  RegisterDeviceDto,
} from "./dto/notifications.dto";
import {
  ApiErrorCode,
  NotificationChannel,
  UserRoleCode,
} from "../../common/constants";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { buildPaginationMeta, parsePagination } from "../../common/pagination";
import { NOTIFICATIONS_QUEUE } from "./notifications.processor";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
  ) {}

  async createAndEnqueue(input: {
    userId: string;
    title: string;
    body: string;
    channel: NotificationChannel;
    payload?: Record<string, unknown>;
  }) {
    const notification = await this.notificationsRepository.create(input);

    const job = await this.notificationsQueue.add(
      "deliver",
      { notificationId: notification.id },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.notificationsRepository.createJob(
      notification.id,
      job.id ?? null,
    );

    return {
      id: notification.id,
      userId: notification.user_id,
      status: notification.status,
    };
  }

  async listInbox(user: JwtPayload, query: ListNotificationsQueryDto) {
    this.assertCollector(user);
    const { page, limit } = parsePagination(query.page, query.limit);
    const { rows, total } = await this.notificationsRepository.listForUser(
      user.sub,
      page,
      limit,
    );

    return {
      data: rows.map((row) => this.mapNotification(row)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async markRead(user: JwtPayload, notificationId: string) {
    this.assertCollector(user);
    const updated = await this.notificationsRepository.markRead(
      notificationId,
      user.sub,
    );
    if (!updated) {
      throw new NotFoundException({
        code: ApiErrorCode.NOTIFICATION_NOT_FOUND,
        message: "Notificación no encontrada",
      });
    }
    return this.mapNotification(updated);
  }

  async registerDevice(user: JwtPayload, dto: RegisterDeviceDto) {
    this.assertCollector(user);
    const token = await this.notificationsRepository.upsertDeviceToken({
      userId: user.sub,
      deviceId: dto.deviceId,
      fcmToken: dto.fcmToken,
      platform: dto.platform,
    });

    return {
      id: token.id,
      deviceId: token.deviceId,
      platform: token.platform,
      updatedAt: token.updatedAt,
    };
  }

  private assertCollector(user: JwtPayload): void {
    if (user.role !== UserRoleCode.COLLECTOR) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "Solo cobradores pueden acceder a notificaciones",
      });
    }
  }

  private mapNotification(row: {
    id: string;
    title: string;
    body: string;
    channel: string;
    status: string;
    payload: Record<string, unknown> | null;
    sent_at: Date | null;
    read_at: Date | null;
    failure_reason: string | null;
    created_at: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      status: row.status,
      payload: row.payload,
      sentAt: row.sent_at,
      readAt: row.read_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
    };
  }
}
