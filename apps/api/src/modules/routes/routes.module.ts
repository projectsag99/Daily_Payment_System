import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Route } from "./entities/route.entity";
import { RouteClientAssignment } from "./entities/route-client-assignment.entity";
import { RouteCollectorAssignment } from "./entities/route-collector-assignment.entity";
import { RoutesRepository } from "./repositories/routes.repository";
import { RoutesService } from "./routes.service";
import { RoutesController } from "./routes.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Route,
      RouteClientAssignment,
      RouteCollectorAssignment,
    ]),
    AuditModule,
  ],
  controllers: [RoutesController],
  providers: [RoutesRepository, RoutesService],
  exports: [RoutesRepository, RoutesService],
})
export class RoutesModule {}
