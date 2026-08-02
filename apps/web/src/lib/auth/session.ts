export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  collectorStatus: string | null;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

const ACCESS_TOKEN_KEY = "dps_access_token";
const REFRESH_TOKEN_KEY = "dps_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

export function isCollector(user: AuthUser | null): boolean {
  return user?.role === "collector";
}

export function canUseWebPanel(user: AuthUser | null): boolean {
  return isAdmin(user) || isCollector(user);
}

export function getHomePath(user: AuthUser | null): string {
  if (!user) return "/login";
  if (isAdmin(user)) return "/dashboard";
  if (user.collectorStatus === "pending") return "/pending-approval";
  if (user.collectorStatus === "suspended") return "/account-suspended";
  return "/my-routes";
}

const ADMIN_ROUTE_PREFIXES = [
  "/dashboard",
  "/collectors",
  "/clients",
  "/routes",
  "/rules",
  "/credits",
  "/pagos",
  "/auditoria",
];

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
