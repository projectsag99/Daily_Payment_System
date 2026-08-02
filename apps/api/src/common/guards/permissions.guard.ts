import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/auth.decorators";
import { ApiErrorCode } from "../constants";
import { JwtPayload } from "../../modules/auth/interfaces/jwt-payload.interface";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const userPermissions = request.user.permissions ?? [];
    const hasAll = required.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: "No tienes permiso para realizar esta acción",
      });
    }

    return true;
  }
}
