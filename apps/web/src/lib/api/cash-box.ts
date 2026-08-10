import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import {
  CashBoxInitialBalance,
  CashBoxSpreadsheet,
  CashBoxSummary,
} from "@/lib/types/cash-box";

export interface CashBoxSummaryParams {
  collectorId: string;
  from?: string;
  to?: string;
  routeId?: string;
}

export interface CashBoxSpreadsheetParams {
  collectorId: string;
  month: string;
}

export interface SetInitialBalancePayload {
  collectorId: string;
  amount: number;
  notes?: string;
}

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchCashBoxSummary(
  params: CashBoxSummaryParams,
): Promise<CashBoxSummary> {
  return apiFetch<CashBoxSummary>(
    `/cash-box/summary${toQuery({
      collectorId: params.collectorId,
      from: params.from,
      to: params.to,
      routeId: params.routeId,
    })}`,
    authHeaders(),
  );
}

export async function fetchCashBoxSpreadsheet(
  params: CashBoxSpreadsheetParams,
): Promise<CashBoxSpreadsheet> {
  return apiFetch<CashBoxSpreadsheet>(
    `/cash-box/spreadsheet${toQuery({
      collectorId: params.collectorId,
      month: params.month,
    })}`,
    authHeaders(),
  );
}

export async function fetchCashBoxInitialBalance(
  collectorId: string,
): Promise<CashBoxInitialBalance> {
  return apiFetch<CashBoxInitialBalance>(
    `/cash-box/initial-balance?collectorId=${encodeURIComponent(collectorId)}`,
    authHeaders(),
  );
}

export async function setCashBoxInitialBalance(
  payload: SetInitialBalancePayload,
): Promise<CashBoxInitialBalance> {
  return apiFetch<CashBoxInitialBalance>("/cash-box/initial-balance", {
    method: "PUT",
    body: JSON.stringify(payload),
    ...authHeaders(),
  });
}
