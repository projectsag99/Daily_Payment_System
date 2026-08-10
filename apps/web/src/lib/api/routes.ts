import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import { ShiftType } from "@/lib/constants";
import {
  AssignCollectorFormValues,
  CreateRoutePayload,
  UpdateRoutePayload,
} from "@/lib/schemas/auth.schema";
import {
  CollectorRoute,
  MyRoutesResponse,
  RouteClient,
  RouteCollectorAssignment,
  RouteSummary,
} from "@/lib/types/routes";

export interface ListRoutesParams {
  shift?: ShiftType;
  isActive?: boolean;
}

function toQuery(params: ListRoutesParams): string {
  const search = new URLSearchParams();
  if (params.shift) search.set("shift", params.shift);
  if (params.isActive !== undefined) {
    search.set("isActive", String(params.isActive));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchRoutes(
  params: ListRoutesParams = {},
): Promise<RouteSummary[]> {
  return apiFetch<RouteSummary[]>(`/routes${toQuery(params)}`, authHeaders());
}

export async function fetchMyRoutes(date?: string): Promise<CollectorRoute[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await apiFetch<MyRoutesResponse>(
    `/routes/my${query}`,
    authHeaders(),
  );
  return response.routes;
}

export async function createRoute(
  values: CreateRoutePayload,
): Promise<RouteSummary> {
  return apiFetch<RouteSummary>("/routes", {
    method: "POST",
    body: JSON.stringify(values),
    ...authHeaders(),
  });
}

export async function updateRoute(
  id: string,
  values: UpdateRoutePayload,
): Promise<RouteSummary> {
  return apiFetch<RouteSummary>(`/routes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
    ...authHeaders(),
  });
}

export async function deleteRoute(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/routes/${id}`, {
    method: "DELETE",
    ...authHeaders(),
  });
}

export async function fetchRouteClients(id: string): Promise<RouteClient[]> {
  return apiFetch<RouteClient[]>(`/routes/${id}/clients`, authHeaders());
}

export async function replaceRouteClients(
  id: string,
  clientIds: string[],
): Promise<RouteClient[]> {
  return apiFetch<RouteClient[]>(`/routes/${id}/clients`, {
    method: "PUT",
    body: JSON.stringify({ clientIds }),
    ...authHeaders(),
  });
}

export async function fetchRouteCollectors(
  id: string,
): Promise<RouteCollectorAssignment[]> {
  return apiFetch<RouteCollectorAssignment[]>(
    `/routes/${id}/collectors`,
    authHeaders(),
  );
}

export async function assignRouteCollector(
  id: string,
  values: AssignCollectorFormValues,
): Promise<RouteCollectorAssignment> {
  return apiFetch<RouteCollectorAssignment>(`/routes/${id}/collectors`, {
    method: "POST",
    body: JSON.stringify(values),
    ...authHeaders(),
  });
}

export async function removeRouteCollector(
  routeId: string,
  assignmentId: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/routes/${routeId}/collectors/${assignmentId}`,
    {
      method: "DELETE",
      ...authHeaders(),
    },
  );
}
