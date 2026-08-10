import { NotifyChannel, RuleType } from "@/lib/constants";

export interface BusinessRule {
  id: string;
  name: string;
  ruleType: RuleType;
  config: Record<string, unknown>;
  isActive: boolean;
  notifyChannel: NotifyChannel;
  cooldownHours: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluateRuleResult {
  ruleId: string;
  evaluatedClients: number;
  matchedClients: number;
  notificationsCreated: number;
}
