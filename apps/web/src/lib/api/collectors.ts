import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import {
  ApproveCollectorFormValues,
  RejectCollectorFormValues,
} from "@/lib/schemas/auth.schema";
import { CollectorSummary } from "@/lib/types/collectors";

export async function fetchPendingCollectors(): Promise<CollectorSummary[]> {
  return apiFetch<CollectorSummary[]>("/collectors?status=pending", authHeaders());
}

export async function fetchActiveCollectors(): Promise<CollectorSummary[]> {
  return apiFetch<CollectorSummary[]>("/collectors?status=active", authHeaders());
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
