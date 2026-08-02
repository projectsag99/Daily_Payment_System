export enum UserRoleCode {
  ADMIN = "admin",
  COLLECTOR = "collector",
}

export enum CollectorStatus {
  PENDING = "pending",
  ACTIVE = "active",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
}

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  SOFT_DELETE = "SOFT_DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  SUSPEND = "SUSPEND",
  REACTIVATE = "REACTIVATE",
  DEACTIVATE = "DEACTIVATE",
  PAYMENT_RECORD = "PAYMENT_RECORD",
  RECEIPT_GENERATE = "RECEIPT_GENERATE",
  RECEIPT_LINK_REVOKE = "RECEIPT_LINK_REVOKE",
  RULE_TRIGGER = "RULE_TRIGGER",
}

export enum ClientStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export enum DocumentType {
  ID_CARD = "id_card",
  IDENTITY_DOCUMENT = "identity_document",
  OTHER = "other",
}

export enum ShiftType {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  EVENING = "evening",
}

export enum VisitStatus {
  PENDING = "pending",
  VISITED = "visited",
  PAID = "paid",
  SKIPPED = "skipped",
  NOT_HOME = "not_home",
}

export enum CreditStatus {
  ACTIVE = "active",
  CLOSED = "closed",
  DEFAULTED = "defaulted",
  WRITTEN_OFF = "written_off",
}

export enum InstallmentStatus {
  PENDING = "pending",
  PARTIAL = "partial",
  PAID = "paid",
  OVERDUE = "overdue",
  WAIVED = "waived",
}

export enum PaymentStatus {
  COMPLETED = "completed",
  REVERSED = "reversed",
  ADJUSTMENT = "adjustment",
}

export enum PaymentMethod {
  CASH = "cash",
  TRANSFER = "transfer",
  OTHER = "other",
}

export enum RuleType {
  OVERDUE_INSTALLMENTS_THRESHOLD = "overdue_installments_threshold",
  ACCUMULATED_UNPAID_QUOTA_THRESHOLD = "accumulated_unpaid_quota_threshold",
}

export enum NotificationChannel {
  IN_APP = "in_app",
  PUSH = "push",
  EMAIL = "email",
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  READ = "read",
}

export enum RuleScope {
  ASSIGNED_COLLECTOR = "assigned_collector",
}

export enum ApiErrorCode {
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  ACCOUNT_NOT_APPROVED = "ACCOUNT_NOT_APPROVED",
  ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED",
  ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED",
  ACCOUNT_REJECTED = "ACCOUNT_REJECTED",
  INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  REFRESH_TOKEN_INVALID = "REFRESH_TOKEN_INVALID",
  REFRESH_TOKEN_REUSE = "REFRESH_TOKEN_REUSE",
  CLIENT_NOT_FOUND = "CLIENT_NOT_FOUND",
  CLIENT_ACCESS_DENIED = "CLIENT_ACCESS_DENIED",
  DOCUMENT_NOT_FOUND = "DOCUMENT_NOT_FOUND",
  STORAGE_KEY_MISMATCH = "STORAGE_KEY_MISMATCH",
  ROUTE_NOT_FOUND = "ROUTE_NOT_FOUND",
  ROUTE_ACCESS_DENIED = "ROUTE_ACCESS_DENIED",
  CREDIT_NOT_FOUND = "CREDIT_NOT_FOUND",
  PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND",
  PAYMENT_IDEMPOTENCY_CONFLICT = "PAYMENT_IDEMPOTENCY_CONFLICT",
  PAYMENT_INVALID_AMOUNT = "PAYMENT_INVALID_AMOUNT",
  RECEIPT_NOT_FOUND = "RECEIPT_NOT_FOUND",
  RECEIPT_LINK_NOT_FOUND = "RECEIPT_LINK_NOT_FOUND",
  RECEIPT_LINK_EXPIRED = "RECEIPT_LINK_EXPIRED",
  RECEIPT_LINK_REVOKED = "RECEIPT_LINK_REVOKED",
  RECEIPT_NOT_READY = "RECEIPT_NOT_READY",
  RULE_NOT_FOUND = "RULE_NOT_FOUND",
  NOTIFICATION_NOT_FOUND = "NOTIFICATION_NOT_FOUND",
}
