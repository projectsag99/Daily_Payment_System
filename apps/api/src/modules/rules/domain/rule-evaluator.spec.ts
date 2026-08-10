import { RuleType } from "../../../common/constants";
import {
  evaluateRuleMatch,
  normalizeRuleConfig,
} from "./rule-evaluator";

describe("rule-evaluator", () => {
  it("matches overdue installments threshold", () => {
    const config = normalizeRuleConfig(
      RuleType.OVERDUE_INSTALLMENTS_THRESHOLD,
      { thresholdCount: 3 },
    );
    expect(
      evaluateRuleMatch(RuleType.OVERDUE_INSTALLMENTS_THRESHOLD, config, {
        overdueInstallmentCount: 3,
        accumulatedUnpaidAmount: 0,
      }),
    ).toBe(true);
    expect(
      evaluateRuleMatch(RuleType.OVERDUE_INSTALLMENTS_THRESHOLD, config, {
        overdueInstallmentCount: 2,
        accumulatedUnpaidAmount: 0,
      }),
    ).toBe(false);
  });

  it("matches accumulated unpaid quota threshold", () => {
    const config = normalizeRuleConfig(
      RuleType.ACCUMULATED_UNPAID_QUOTA_THRESHOLD,
      { thresholdAmount: 500 },
    );
    expect(
      evaluateRuleMatch(RuleType.ACCUMULATED_UNPAID_QUOTA_THRESHOLD, config, {
        overdueInstallmentCount: 0,
        accumulatedUnpaidAmount: 500,
      }),
    ).toBe(true);
  });

  it("normalizes snake_case config keys", () => {
    const config = normalizeRuleConfig(
      RuleType.OVERDUE_INSTALLMENTS_THRESHOLD,
      { threshold_count: 5 },
    );
    expect(config).toEqual({ thresholdCount: 5, scope: "assigned_collector" });
  });
});
