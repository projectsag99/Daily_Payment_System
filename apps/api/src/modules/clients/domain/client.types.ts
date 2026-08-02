import { ClientStatus, ShiftType, UserRoleCode } from "../../../common/constants";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ClientListFilters {
  q?: string;
  status?: ClientStatus;
  routeId?: string;
  shift?: ShiftType;
  overdue?: boolean;
  near?: GeoPoint;
  radiusM?: number;
}

export interface ClientAccessContext {
  userId: string;
  role: string;
}

export function isAdminRole(role: string): boolean {
  return role === UserRoleCode.ADMIN;
}

export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export interface ClientRow {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  status: ClientStatus;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  active_credits_count?: string;
  overdue_installments_count?: string;
}
