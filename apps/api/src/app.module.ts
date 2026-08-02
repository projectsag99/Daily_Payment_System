import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CollectorsModule } from "./modules/collectors/collectors.module";
import { AuditModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { StorageModule } from "./modules/storage/storage.module";
import { RoutesModule } from "./modules/routes/routes.module";
import { CreditsModule } from "./modules/credits/credits.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { CollectorActiveGuard } from "./common/guards/collector-active.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CollectorsModule,
    AuditModule,
    HealthModule,
    DashboardModule,
    StorageModule,
    ClientsModule,
    RoutesModule,
    CreditsModule,
    PaymentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: CollectorActiveGuard },
  ],
})
export class AppModule {}
