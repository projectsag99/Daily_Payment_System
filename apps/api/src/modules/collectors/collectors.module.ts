import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectorProfile } from "./entities/collector-profile.entity";
import { CollectorsRepository } from "./repositories/collectors.repository";
import { CollectorsService } from "./collectors.service";
import { CollectorsController } from "./collectors.controller";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([CollectorProfile]),
    AuditModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [CollectorsController],
  providers: [CollectorsRepository, CollectorsService],
  exports: [CollectorsRepository, CollectorsService],
})
export class CollectorsModule {}
