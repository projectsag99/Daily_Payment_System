import { SetMetadata } from "@nestjs/common";
import { UserRoleCode } from "../constants";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRoleCode[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = "permissions";
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const SKIP_COLLECTOR_ACTIVE_KEY = "skipCollectorActive";
export const SkipCollectorActiveCheck = () =>
  SetMetadata(SKIP_COLLECTOR_ACTIVE_KEY, true);

export const REQUIRE_COLLECTOR_ACTIVE_KEY = "requireCollectorActive";
export const RequireCollectorActive = () =>
  SetMetadata(REQUIRE_COLLECTOR_ACTIVE_KEY, true);
