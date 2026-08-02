import { RuleType } from "../../../common/constants";

export interface OverdueInstallmentsRuleConfig {
  thresholdCount: number;
  scope: "assigned_collector";
}

export interface AccumulatedUnpaidRuleConfig {
  thresholdAmount: number;
  scope: "assigned_collector";
}

export type BusinessRuleConfig =
  | OverdueInstallmentsRuleConfig
  | AccumulatedUnpaidRuleConfig;

export interface ClientRuleMetrics {
  overdueInstallmentCount: number;
  accumulatedUnpaidAmount: number;
}

export function normalizeRuleConfig(
  ruleType: RuleType,
  raw: Record<string, unknown>,
): BusinessRuleConfig {
  if (ruleType === RuleType.OVERDUE_INSTALLMENTS_THRESHOLD) {
    const thresholdCount = Number(
      raw.thresholdCount ?? raw.threshold_count ?? 0,
    );
    return {
      thresholdCount,
      scope: "assigned_collector",
    };
  }

  const thresholdAmount = Number(
    raw.thresholdAmount ?? raw.threshold_amount ?? 0,
  );
  return {
    thresholdAmount,
    scope: "assigned_collector",
  };
}

export function evaluateRuleMatch(
  ruleType: RuleType,
  config: BusinessRuleConfig,
  metrics: ClientRuleMetrics,
): boolean {
  if (ruleType === RuleType.OVERDUE_INSTALLMENTS_THRESHOLD) {
    const ruleConfig = config as OverdueInstallmentsRuleConfig;
    return metrics.overdueInstallmentCount >= ruleConfig.thresholdCount;
  }

  const ruleConfig = config as AccumulatedUnpaidRuleConfig;
  return metrics.accumulatedUnpaidAmount >= ruleConfig.thresholdAmount;
}

export function buildRuleNotificationContent(input: {
  ruleName: string;
  clientCode: string;
  clientFirstName: string;
  ruleType: RuleType;
  metrics: ClientRuleMetrics;
}): { title: string; body: string } {
  if (input.ruleType === RuleType.OVERDUE_INSTALLMENTS_THRESHOLD) {
    return {
      title: "Cliente con cuotas vencidas",
      body: `${input.clientFirstName} (${input.clientCode}) tiene ${input.metrics.overdueInstallmentCount} cuota(s) vencida(s). Regla: ${input.ruleName}.`,
    };
  }

  return {
    title: "Cliente con saldo acumulado alto",
    body: `${input.clientFirstName} (${input.clientCode}) acumula $${input.metrics.accumulatedUnpaidAmount.toFixed(2)} pendiente. Regla: ${input.ruleName}.`,
  };
}
