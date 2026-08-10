import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditService } from "./audit.service";
import { AuditRepository } from "./repositories/audit.repository";
import { AuditQueryService } from "./audit-query.service";
import { AuditController } from "./audit.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository, AuditQueryService],
  exports: [AuditService],
})
export class AuditModule {}
