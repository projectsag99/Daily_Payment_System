import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import {
  ApproveCollectorFormValues,
  DeactivateCollectorFormValues,
  RejectCollectorFormValues,
  SuspendCollectorFormValues,
} from "@/lib/schemas/auth.schema";
import { CollectorSummary, CollectorStatus } from "@/lib/types/collectors";

export async function fetchCollectors(
  status?: CollectorStatus,
): Promise<CollectorSummary[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<CollectorSummary[]>(`/collectors${query}`, authHeaders());
}

export async function fetchPendingCollectors(): Promise<CollectorSummary[]> {
  return fetchCollectors("pending");
}

export async function fetchActiveCollectors(): Promise<CollectorSummary[]> {
  return fetchCollectors("active");
}

export async function fetchAssignableCollectors(): Promise<CollectorSummary[]> {
  return apiFetch<CollectorSummary[]>("/collectors?assignable=true", authHeaders());
}

export async function fetchCollector(id: string): Promise<CollectorSummary> {
  return apiFetch<CollectorSummary>(`/collectors/${id}`, authHeaders());
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

export async function suspendCollector(
  id: string,
  data: SuspendCollectorFormValues,
): Promise<CollectorSummary> {
  return apiFetch<CollectorSummary>(`/collectors/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify(data),
    ...authHeaders(),
  });
}

export async function reactivateCollector(id: string): Promise<CollectorSummary> {
  return apiFetch<CollectorSummary>(`/collectors/${id}/reactivate`, {
    method: "POST",
    body: JSON.stringify({}),
    ...authHeaders(),
  });
}

export async function deactivateCollector(
  id: string,
  data: DeactivateCollectorFormValues,
): Promise<CollectorSummary> {
  return apiFetch<CollectorSummary>(`/collectors/${id}/deactivate`, {
    method: "POST",
    body: JSON.stringify(data),
    ...authHeaders(),
  });
}
