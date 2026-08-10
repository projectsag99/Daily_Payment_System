import { ShiftType } from "../../../common/constants";

export function dayOfWeekForDate(dateStr: string, timezone: string): number {
  const date = new Date(`${dateStr}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function routeAppliesOnDate(
  routeDayOfWeek: number | null,
  visitDate: string,
  timezone: string,
): boolean {
  if (routeDayOfWeek === null) {
    return true;
  }
  return routeDayOfWeek === dayOfWeekForDate(visitDate, timezone);
}

export interface RouteSummaryRow {
  id: string;
  name: string;
  shift: ShiftType;
  day_of_week: number | null;
  is_active: boolean;
  description: string | null;
  country: string | null;
  department: string | null;
  city: string | null;
  client_count: string;
  collector_id: string | null;
  collector_name: string | null;
  collected_today_pct: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RouteClientRow {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  sequence_order: number;
  visit_status: string;
  amount_due: string | null;
  overdue_installment_count: string | null;
  lat: number | null;
  lng: number | null;
}
