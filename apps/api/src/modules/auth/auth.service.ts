import { Injectable, UnauthorizedException, ForbiddenException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { UsersRepository } from "../users/repositories/users.repository";
import { CollectorsRepository } from "../collectors/repositories/collectors.repository";
import { RefreshTokenRepository } from "./repositories/refresh-token.repository";
import { AuditService } from "../audit/audit.service";
import {
  ApiErrorCode,
  AuditAction,
  CollectorStatus,
  UserRoleCode,
} from "../../common/constants";
import { User } from "../users/entities/user.entity";
import {
  AuthUserView,
  JwtPayload,
  TokenPair,
} from "./interfaces/jwt-payload.interface";
import {
  canCollectorLogin,
} from "../collectors/domain/collector-status.fsm";
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
} from "./dto/auth.dto";
import { Role } from "../users/entities/role.entity";
import { Permission } from "../users/entities/permission.entity";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly collectorsRepository: CollectorsRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<{
    id: string;
    email: string;
    role: string;
    collectorStatus: string;
    message: string;
  }> {
    if (await this.usersRepository.emailExists(dto.email)) {
      throw new ConflictException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "El correo electrónico ya está registrado",
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersRepository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    await this.usersRepository.assignRole(user.id, UserRoleCode.COLLECTOR);
    const profile = await this.collectorsRepository.createForUser(user.id);

    await this.auditService.log({
      actorId: user.id,
      action: AuditAction.CREATE,
      entityType: "user",
      entityId: user.id,
      afterState: { email: user.email, role: UserRoleCode.COLLECTOR },
      ipAddress: ipAddress ?? null,
    });

    return {
      id: user.id,
      email: user.email,
      role: UserRoleCode.COLLECTOR,
      collectorStatus: profile.status,
      message:
        "Registro exitoso. Esperando aprobación del administrador.",
    };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
  ): Promise<{ user: AuthUserView } & TokenPair> {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException({
        code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        message: "Credenciales incorrectas",
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.auditService.log({
        action: AuditAction.LOGIN,
        entityType: "user",
        entityId: user.id,
        metadata: { success: false, reason: "invalid_password" },
        ipAddress: ipAddress ?? null,
      });
      throw new UnauthorizedException({
        code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        message: "Credenciales incorrectas",
      });
    }

    const collectorStatus = user.collectorProfile?.status ?? null;
    const loginCheck = canCollectorLogin(collectorStatus);
    if (!loginCheck.allowed) {
      throw new ForbiddenException({
        code: loginCheck.errorCode ?? ApiErrorCode.ACCOUNT_NOT_APPROVED,
        message: loginCheck.message ?? "Acceso denegado",
      });
    }

    await this.usersRepository.updateLastLogin(user.id);

    const tokens = await this.issueTokenPair(user);

    await this.auditService.log({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: "user",
      entityId: user.id,
      metadata: { success: true, collectorStatus },
      ipAddress: ipAddress ?? null,
    });

    return {
      ...tokens,
      user: this.toAuthUserView(user),
    };
  }

  async refresh(refreshToken: string): Promise<{ user: AuthUserView } & TokenPair> {
    const tokenHash = this.refreshTokenRepository.hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!stored) {
      throw new UnauthorizedException({
        code: ApiErrorCode.REFRESH_TOKEN_INVALID,
        message: "Sesión expirada. Inicia sesión nuevamente.",
      });
    }

    if (stored.revokedAt) {
      await this.refreshTokenRepository.revokeFamily(stored.familyId);
      throw new UnauthorizedException({
        code: ApiErrorCode.REFRESH_TOKEN_REUSE,
        message: "Sesión inválida. Inicia sesión nuevamente.",
      });
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: ApiErrorCode.REFRESH_TOKEN_INVALID,
        message: "Sesión expirada. Inicia sesión nuevamente.",
      });
    }

    const user = await this.usersRepository.findById(stored.userId);
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException({
        code: ApiErrorCode.REFRESH_TOKEN_INVALID,
        message: "Sesión expirada. Inicia sesión nuevamente.",
      });
    }

    await this.refreshTokenRepository.revoke(stored.id);
    const tokens = await this.issueTokenPair(user, stored.familyId);

    return {
      ...tokens,
      user: this.toAuthUserView(user),
    };
  }

  async logout(
    userId: string,
    refreshToken?: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenHash = this.refreshTokenRepository.hashToken(refreshToken);
      const stored = await this.refreshTokenRepository.findValidByHash(tokenHash);
      if (stored && stored.userId === userId) {
        await this.refreshTokenRepository.revoke(stored.id);
      }
    } else {
      await this.refreshTokenRepository.revokeAllForUser(userId);
    }

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.LOGOUT,
      entityType: "user",
      entityId: userId,
      ipAddress: ipAddress ?? null,
    });

    return { message: "Sesión cerrada correctamente" };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({
        code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        message: "La contraseña actual es incorrecta",
      });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersRepository.updatePassword(userId, passwordHash);
    await this.refreshTokenRepository.revokeAllForUser(userId);

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.UPDATE,
      entityType: "user",
      entityId: userId,
      metadata: { field: "password" },
    });

    return { message: "Contraseña actualizada correctamente" };
  }

  async getMe(userId: string): Promise<AuthUserView> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toAuthUserView(user);
  }

  private async issueTokenPair(
    user: User,
    existingFamilyId?: string,
  ): Promise<TokenPair> {
    const role = user.roles[0]?.code ?? UserRoleCode.COLLECTOR;
    const permissions = [
      ...new Set(
        user.roles.flatMap((r: Role) =>
          r.permissions?.map((p: Permission) => p.code) ?? [],
        ),
      ),
    ];
    const collectorStatus = user.collectorProfile?.status ?? null;
    const jti = uuidv4();

    const accessTtlMinutes = this.configService.get<number>(
      "jwt.accessTtlMinutes",
      15,
    );
    const refreshTtlDays = this.configService.get<number>("jwt.refreshTtlDays", 7);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role,
      collectorStatus,
      permissions,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("jwt.accessSecret"),
      expiresIn: `${accessTtlMinutes}m`,
    });

    const refreshToken = uuidv4();
    const familyId = existingFamilyId ?? uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTtlDays);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.refreshTokenRepository.hashToken(refreshToken),
      familyId,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtlMinutes * 60,
    };
  }

  toAuthUserView(user: User): AuthUserView {
    const role = user.roles[0]?.code ?? UserRoleCode.COLLECTOR;
    const permissions = [
      ...new Set(
        user.roles.flatMap((r: Role) =>
          r.permissions?.map((p: Permission) => p.code) ?? [],
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role,
      collectorStatus: user.collectorProfile?.status ?? null,
      permissions,
    };
  }
}
