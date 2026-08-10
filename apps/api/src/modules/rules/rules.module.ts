import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessRule } from "./entities/business-rule.entity";
import { RulesRepository } from "./repositories/rules.repository";
import { RulesService } from "./rules.service";
import { RulesController } from "./rules.controller";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessRule]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [RulesController],
  providers: [RulesRepository, RulesService],
  exports: [RulesService],
})
export class RulesModule {}
