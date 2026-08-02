import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Notification } from "../entities/notification.entity";
import { DevicePushToken } from "../entities/device-push-token.entity";
import { NotificationChannel, NotificationStatus } from "../../../common/constants";

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload: Record<string, unknown> | null;
  sent_at: Date | null;
  read_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
}

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(DevicePushToken)
    private readonly deviceTokenRepository: Repository<DevicePushToken>,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: {
    userId: string;
    title: string;
    body: string;
    channel: NotificationChannel;
    payload?: Record<string, unknown>;
  }): Promise<NotificationRow> {
    const rows = await this.dataSource.query(
      `INSERT INTO notifications (
        user_id, title, body, channel, status, payload
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        input.userId,
        input.title,
        input.body,
        input.channel,
        NotificationStatus.PENDING,
        input.payload ? JSON.stringify(input.payload) : null,
      ],
    );
    return rows[0] as NotificationRow;
  }

  async createJob(notificationId: string, bullJobId: string | null): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO notification_jobs (notification_id, bull_job_id)
       VALUES ($1, $2)`,
      [notificationId, bullJobId],
    );
  }

  async findById(notificationId: string): Promise<NotificationRow | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM notifications WHERE id = $1`,
      [notificationId],
    );
    return (rows[0] as NotificationRow | undefined) ?? null;
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ rows: NotificationRow[]; total: number }> {
    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1`,
      [userId],
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (page - 1) * limit;
    const rows = await this.dataSource.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { rows: rows as NotificationRow[], total };
  }

  async markRead(notificationId: string, userId: string): Promise<NotificationRow | null> {
    const rows = await this.dataSource.query(
      `UPDATE notifications
       SET status = 'read', read_at = now()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING *`,
      [notificationId, userId],
    );
    return (rows[0] as NotificationRow | undefined) ?? null;
  }

  async markSent(notificationId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE notifications
       SET status = 'sent', sent_at = now(), failure_reason = NULL
       WHERE id = $1`,
      [notificationId],
    );
  }

  async markFailed(notificationId: string, reason: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE notifications
       SET status = 'failed', failure_reason = $2
       WHERE id = $1`,
      [notificationId, reason],
    );
  }

  async incrementJobAttempt(notificationId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE notification_jobs
       SET attempts = attempts + 1, last_attempt_at = now()
       WHERE notification_id = $1`,
      [notificationId],
    );
  }

  async markJobDlq(notificationId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE notification_jobs
       SET dlq_at = now()
       WHERE notification_id = $1`,
      [notificationId],
    );
  }

  async upsertDeviceToken(input: {
    userId: string;
    deviceId: string;
    fcmToken: string;
    platform?: string;
  }): Promise<DevicePushToken> {
    const rows = await this.dataSource.query(
      `INSERT INTO device_push_tokens (user_id, device_id, fcm_token, platform, last_used_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET
         fcm_token = EXCLUDED.fcm_token,
         platform = EXCLUDED.platform,
         updated_at = now(),
         last_used_at = now()
       RETURNING *`,
      [input.userId, input.deviceId, input.fcmToken, input.platform ?? null],
    );
    return rows[0] as DevicePushToken;
  }

  async listDeviceTokens(userId: string): Promise<DevicePushToken[]> {
    return this.deviceTokenRepository.find({ where: { userId } });
  }
}
