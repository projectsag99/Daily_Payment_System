import { CollectorStatus } from "../../../common/constants";

export type CollectorTransitionAction =
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "deactivate";

const TRANSITIONS: Record<
  CollectorStatus,
  Partial<Record<CollectorTransitionAction, CollectorStatus>>
> = {
  [CollectorStatus.PENDING]: {
    approve: CollectorStatus.ACTIVE,
    reject: CollectorStatus.REJECTED,
  },
  [CollectorStatus.ACTIVE]: {
    suspend: CollectorStatus.SUSPENDED,
    deactivate: CollectorStatus.DEACTIVATED,
  },
  [CollectorStatus.SUSPENDED]: {
    reactivate: CollectorStatus.ACTIVE,
    deactivate: CollectorStatus.DEACTIVATED,
  },
  [CollectorStatus.REJECTED]: {},
  [CollectorStatus.DEACTIVATED]: {},
};

export function getNextCollectorStatus(
  current: CollectorStatus,
  action: CollectorTransitionAction,
): CollectorStatus | null {
  return TRANSITIONS[current]?.[action] ?? null;
}

export function getAuditActionForTransition(
  action: CollectorTransitionAction,
): "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE" | "DEACTIVATE" {
  const map: Record<
    CollectorTransitionAction,
    "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE" | "DEACTIVATE"
  > = {
    approve: "APPROVE",
    reject: "REJECT",
    suspend: "SUSPEND",
    reactivate: "REACTIVATE",
    deactivate: "DEACTIVATE",
  };
  return map[action];
}

export function canCollectorLogin(status: CollectorStatus | null): {
  allowed: boolean;
  errorCode?: string;
  message?: string;
} {
  if (!status) {
    return { allowed: true };
  }

  switch (status) {
    case CollectorStatus.REJECTED:
      return {
        allowed: false,
        errorCode: "ACCOUNT_REJECTED",
        message: "Tu cuenta fue rechazada. Contacta al administrador.",
      };
    case CollectorStatus.DEACTIVATED:
      return {
        allowed: false,
        errorCode: "ACCOUNT_DEACTIVATED",
        message: "Tu cuenta está desactivada.",
      };
    default:
      return { allowed: true };
  }
}

export function canCollectorOperate(status: CollectorStatus | null): boolean {
  return status === CollectorStatus.ACTIVE;
}
