import { ShiftType } from "@/lib/constants";
import { GeoPoint } from "@/lib/types/clients";

export interface RouteSummary {
  id: string;
  name: string;
  shift: ShiftType;
  dayOfWeek: number | null;
  isActive: boolean;
  description: string | null;
  country: string | null;
  department: string | null;
  city: string | null;
  clientCount: number;
  assignedCollector: { id: string; name: string } | null;
  collectedTodayPct: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteClient {
  id: string;
  code: string;
  fullName: string;
  sequenceOrder: number;
  visitStatus: string;
  amountDue: number;
  overdueInstallmentCount: number;
  location: GeoPoint | null;
}

export interface CollectorRoute extends RouteSummary {
  clients: RouteClient[];
}

export interface MyRoutesResponse {
  routes: CollectorRoute[];
}

export interface RouteCollectorAssignment {
  id: string;
  collectorId: string;
  collectorName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}
