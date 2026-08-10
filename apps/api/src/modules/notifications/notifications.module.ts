import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Notification } from "./entities/notification.entity";
import { DevicePushToken } from "./entities/device-push-token.entity";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NOTIFICATIONS_QUEUE, NotificationsProcessor } from "./notifications.processor";
import { PushDeliveryService } from "./push-delivery.service";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>("redis.url", "redis://localhost:6379"),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    TypeOrmModule.forFeature([Notification, DevicePushToken]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationsProcessor,
    PushDeliveryService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
