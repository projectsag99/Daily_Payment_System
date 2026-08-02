import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PushDeliveryService } from "./push-delivery.service";

export const NOTIFICATIONS_QUEUE = "notifications";

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly pushDeliveryService: PushDeliveryService) {
    super();
  }

  async process(job: Job<{ notificationId: string }>): Promise<void> {
    await this.pushDeliveryService.deliver(job.data.notificationId);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<{ notificationId: string }>, error: Error) {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `Notification ${job.data.notificationId} moved to DLQ: ${error.message}`,
      );
      await this.pushDeliveryService.markDeliveryFailed(
        job.data.notificationId,
        error.message,
      );
    }
  }
}
