export interface CollectorSummary {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  employeeCode: string | null;
  createdAt: string;
}

export type CollectorStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "deactivated";

export const COLLECTOR_STATUS_LABELS: Record<CollectorStatus, string> = {
  pending: "Pendiente",
  active: "Activo",
  rejected: "Rechazado",
  suspended: "Suspendido",
  deactivated: "Desactivado",
};
