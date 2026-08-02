import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/auth.decorators";
import { UserRoleCode, ApiErrorCode } from "../constants";
import { JwtPayload } from "../../modules/auth/interfaces/jwt-payload.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleCode[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!requiredRoles.includes(user.role as UserRoleCode)) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "No tienes permiso para realizar esta acción",
      });
    }

    return true;
  }
}
