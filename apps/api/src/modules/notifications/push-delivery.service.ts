import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { NotificationChannel } from "../../common/constants";

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);
  private readonly fcmServerKey: string | undefined;

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    configService: ConfigService,
  ) {
    this.fcmServerKey = configService.get<string>("fcm.serverKey");
  }

  async deliver(notificationId: string): Promise<void> {
    await this.notificationsRepository.incrementJobAttempt(notificationId);

    const notification =
      await this.notificationsRepository.findById(notificationId);
    if (!notification) {
      return;
    }

    if (notification.channel === NotificationChannel.EMAIL) {
      throw new Error("Canal email no implementado en v1");
    }

    if (notification.channel === NotificationChannel.PUSH) {
      const tokens = await this.notificationsRepository.listDeviceTokens(
        notification.user_id,
      );
      if (tokens.length === 0) {
        this.logger.warn(
          `Notification ${notificationId}: sin tokens FCM registrados`,
        );
      } else if (this.fcmServerKey) {
        await this.sendFcm(notification.title, notification.body, tokens);
      } else {
        this.logger.warn(
          `Notification ${notificationId}: FCM no configurado, entrega in-app`,
        );
      }
    }

    await this.notificationsRepository.markSent(notificationId);
  }

  async markDeliveryFailed(
    notificationId: string,
    reason: string,
  ): Promise<void> {
    await this.notificationsRepository.markFailed(notificationId, reason);
    await this.notificationsRepository.markJobDlq(notificationId);
  }

  private async sendFcm(
    title: string,
    body: string,
    tokens: Array<{ fcmToken: string }>,
  ): Promise<void> {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${this.fcmServerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_ids: tokens.map((token) => token.fcmToken),
        notification: { title, body },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FCM error: ${response.status} ${text}`);
    }
  }
}
