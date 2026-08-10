import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Receipt } from "./entities/receipt.entity";
import { ReceiptLink } from "./entities/receipt-link.entity";
import { ReceiptsRepository } from "./repositories/receipts.repository";
import { ReceiptsService } from "./receipts.service";
import { ReceiptsController } from "./receipts.controller";
import { PublicReceiptsController } from "./public-receipts.controller";
import { ClientsModule } from "../clients/clients.module";
import { StorageModule } from "../storage/storage.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptLink]),
    ClientsModule,
    StorageModule,
    AuditModule,
  ],
  controllers: [ReceiptsController, PublicReceiptsController],
  providers: [ReceiptsRepository, ReceiptsService],
  exports: [ReceiptsService, ReceiptsRepository],
})
export class ReceiptsModule {}
