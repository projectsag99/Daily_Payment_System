import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth/session";
import {
  ApproveCollectorFormValues,
  RejectCollectorFormValues,
} from "@/lib/schemas/auth.schema";
import { CollectorSummary } from "@/lib/types/collectors";

function authHeaders() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No hay sesión activa");
  }
  return { token };
}

export async function fetchPendingCollectors(): Promise<CollectorSummary[]> {
  return apiFetch<CollectorSummary[]>("/collectors?status=pending", authHeaders());
}

export async function approveCollector(
  id: string,
  data: ApproveCollectorFormValues,
): Promise<CollectorSummary> {
  return apiFetch<CollectorSummary>(`/collectors/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(data),
    ...authHeaders(),
  });
}

export async function rejectCollector(
  id: string,
  data: RejectCollectorFormValues,
): Promise<CollectorSummary> {
  return apiFetch<CollectorSummary>(`/collectors/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(data),
    ...authHeaders(),
  });
}
