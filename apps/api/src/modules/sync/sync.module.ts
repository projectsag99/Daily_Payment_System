import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SyncEvent } from "./entities/sync-event.entity";
import { SyncRepository } from "./repositories/sync.repository";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [TypeOrmModule.forFeature([SyncEvent]), PaymentsModule],
  controllers: [SyncController],
  providers: [SyncRepository, SyncService],
  exports: [SyncService],
})
export class SyncModule {}
