import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import {
  CreateRuleFormValues,
  UpdateRuleFormValues,
  buildRuleConfig,
} from "@/lib/schemas/auth.schema";
import { BusinessRule, EvaluateRuleResult } from "@/lib/types/rules";

function toCreatePayload(values: CreateRuleFormValues) {
  const { thresholdCount, thresholdAmount, ruleType, ...rest } = values;
  return {
    ...rest,
    ruleType,
    config: buildRuleConfig({ ruleType, thresholdCount, thresholdAmount }),
  };
}

export async function fetchRules(): Promise<BusinessRule[]> {
  return apiFetch<BusinessRule[]>("/rules", authHeaders());
}

export async function createRule(
  values: CreateRuleFormValues,
): Promise<BusinessRule> {
  return apiFetch<BusinessRule>("/rules", {
    method: "POST",
    body: JSON.stringify(toCreatePayload(values)),
    ...authHeaders(),
  });
}

export async function updateRule(
  id: string,
  values: UpdateRuleFormValues & { ruleType?: CreateRuleFormValues["ruleType"] },
): Promise<BusinessRule> {
  const { thresholdCount, thresholdAmount, ruleType, ...rest } = values;
  const payload: Record<string, unknown> = { ...rest };
  if (ruleType) {
    payload.config = buildRuleConfig({
      ruleType,
      thresholdCount,
      thresholdAmount,
    });
  }
  return apiFetch<BusinessRule>(`/rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    ...authHeaders(),
  });
}

export async function deleteRule(
  id: string,
): Promise<{ message: string; ruleId: string }> {
  return apiFetch<{ message: string; ruleId: string }>(`/rules/${id}`, {
    method: "DELETE",
    ...authHeaders(),
  });
}

export async function evaluateRule(
  id: string,
  clientId?: string,
): Promise<EvaluateRuleResult> {
  return apiFetch<EvaluateRuleResult>(`/rules/${id}/evaluate`, {
    method: "POST",
    body: JSON.stringify(clientId ? { clientId } : {}),
    ...authHeaders(),
  });
}
