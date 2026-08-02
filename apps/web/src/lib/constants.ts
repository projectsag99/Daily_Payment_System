export const CLIENT_STATUSES = ["active", "inactive", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const SHIFT_TYPES = ["morning", "afternoon", "evening"] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const CREDIT_STATUSES = [
  "active",
  "closed",
  "defaulted",
  "written_off",
] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const RULE_TYPES = [
  "overdue_installments_threshold",
  "accumulated_unpaid_quota_threshold",
] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export const NOTIFY_CHANNELS = ["in_app", "push", "email"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  archived: "Archivado",
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  evening: "Noche",
};

export const CREDIT_STATUS_LABELS: Record<CreditStatus, string> = {
  active: "Activo",
  closed: "Cerrado",
  defaulted: "En mora",
  written_off: "Castigado",
};

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  overdue_installments_threshold: "Cuotas vencidas (umbral)",
  accumulated_unpaid_quota_threshold: "Cuota acumulada impaga (umbral)",
};

export const NOTIFY_CHANNEL_LABELS: Record<NotifyChannel, string> = {
  in_app: "En app",
  push: "Push",
  email: "Email",
};

export const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
