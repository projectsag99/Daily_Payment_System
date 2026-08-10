import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Client } from "./entities/client.entity";
import { ClientDocument } from "./entities/client-document.entity";
import { ClientLocationHistory } from "./entities/client-location-history.entity";
import { ClientsRepository } from "./repositories/clients.repository";
import { ClientsService } from "./clients.service";
import {
  ClientsController,
  ClientDocumentsController,
} from "./clients.controller";
import { AuditModule } from "../audit/audit.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientDocument, ClientLocationHistory]),
    AuditModule,
    StorageModule,
  ],
  controllers: [ClientsController, ClientDocumentsController],
  providers: [ClientsRepository, ClientsService],
  exports: [ClientsRepository, ClientsService],
})
export class ClientsModule {}
