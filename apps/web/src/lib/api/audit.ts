import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import { ListAuditParams, PaginatedAuditLogs } from "@/lib/types/audit";

function toQuery(params: ListAuditParams): string {
  const search = new URLSearchParams();
  if (params.entityType) search.set("entityType", params.entityType);
  if (params.entityId) search.set("entityId", params.entityId);
  if (params.actorId) search.set("actorId", params.actorId);
  if (params.action) search.set("action", params.action);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchAuditLogs(
  params: ListAuditParams = {},
): Promise<PaginatedAuditLogs> {
  return apiFetch<PaginatedAuditLogs>(
    `/audit${toQuery(params)}`,
    authHeaders(),
  );
}
