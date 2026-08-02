import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  REQUIRE_COLLECTOR_ACTIVE_KEY,
  SKIP_COLLECTOR_ACTIVE_KEY,
} from "../decorators/auth.decorators";
import {
  ApiErrorCode,
  CollectorStatus,
  UserRoleCode,
} from "../constants";
import { JwtPayload } from "../../modules/auth/interfaces/jwt-payload.interface";

@Injectable()
export class CollectorActiveGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_COLLECTOR_ACTIVE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }

    const requireActive = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_COLLECTOR_ACTIVE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireActive) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (user.role !== UserRoleCode.COLLECTOR) {
      return true;
    }

    if (user.collectorStatus === CollectorStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: ApiErrorCode.ACCOUNT_SUSPENDED,
        message: "Tu cuenta está suspendida. Contacta al administrador.",
      });
    }

    if (user.collectorStatus !== CollectorStatus.ACTIVE) {
      throw new ForbiddenException({
        code: ApiErrorCode.ACCOUNT_NOT_APPROVED,
        message: "Tu cuenta de cobrador aún no está aprobada.",
      });
    }

    return true;
  }
}
