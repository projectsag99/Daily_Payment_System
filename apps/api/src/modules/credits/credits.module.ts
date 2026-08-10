import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Credit } from "./entities/credit.entity";
import { Installment } from "./entities/installment.entity";
import { CreditsRepository } from "./repositories/credits.repository";
import { CreditsService } from "./credits.service";
import { CreditsController } from "./credits.controller";
import { ClientsModule } from "../clients/clients.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Credit, Installment]),
    ClientsModule,
    AuditModule,
  ],
  controllers: [CreditsController],
  providers: [CreditsRepository, CreditsService],
  exports: [CreditsRepository, CreditsService],
})
export class CreditsModule {}
