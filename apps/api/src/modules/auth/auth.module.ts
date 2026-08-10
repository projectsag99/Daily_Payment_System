import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshToken } from "./entities/refresh-token.entity";
import { RefreshTokenRepository } from "./repositories/refresh-token.repository";
import { UsersModule } from "../users/users.module";
import { CollectorsModule } from "../collectors/collectors.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    UsersModule,
    forwardRef(() => CollectorsModule),
    AuditModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("jwt.accessSecret"),
      }),
    }),
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenRepository],
  exports: [AuthService, JwtStrategy, RefreshTokenRepository],
})
export class AuthModule {}
