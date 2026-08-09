import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
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
import { ReceiptsModule } from "./modules/receipts/receipts.module";
import { RulesModule } from "./modules/rules/rules.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SyncModule } from "./modules/sync/sync.module";
import { CashBoxModule } from "./modules/cash-box/cash-box.module";
import { BusinessCalendarModule } from "./modules/business-calendar/business-calendar.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { MetricsInterceptor } from "./common/interceptors/metrics.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { CollectorActiveGuard } from "./common/guards/collector-active.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, "../../../.env"),
        join(__dirname, "../../.env"),
        ".env",
      ],
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 300,
      },
    ]),
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
    ReceiptsModule,
    RulesModule,
    NotificationsModule,
    SyncModule,
    CashBoxModule,
    BusinessCalendarModule,
    MetricsModule,
  ],
  providers: [
    LoggingInterceptor,
    MetricsInterceptor,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: CollectorActiveGuard },
  ],
})
export class AppModule {}
