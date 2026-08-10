import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import { ClientStatus } from "@/lib/constants";
import {
  CreateClientPayload,
  UpdateClientPayload,
} from "@/lib/schemas/auth.schema";
import {
  Client,
  ClientInstallment,
  ClientPayment,
  ClientRoute,
  PaginatedClients,
} from "@/lib/types/clients";

export interface ListClientsParams {
  q?: string;
  status?: ClientStatus;
  routeId?: string;
  page?: number;
  limit?: number;
}

function toQuery(params: ListClientsParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.routeId) search.set("routeId", params.routeId);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function toApiCreatePayload(values: CreateClientPayload) {
  const { lat, lng, ...rest } = values;
  return {
    ...rest,
    location:
      lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
  };
}

function toApiUpdatePayload(values: UpdateClientPayload) {
  const { lat, lng, email, ...rest } = values;
  const payload: Record<string, unknown> = { ...rest };
  if (email !== undefined) payload.email = email || null;
  if (lat !== undefined && lng !== undefined) {
    payload.location = { lat, lng };
  }
  return payload;
}

export async function fetchClients(
  params: ListClientsParams = {},
): Promise<PaginatedClients> {
  return apiFetch<PaginatedClients>(`/clients${toQuery(params)}`, authHeaders());
}

export async function fetchClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, authHeaders());
}

export async function createClient(values: CreateClientPayload): Promise<Client> {
  return apiFetch<Client>("/clients", {
    method: "POST",
    body: JSON.stringify(toApiCreatePayload(values)),
    ...authHeaders(),
  });
}

export async function updateClient(
  id: string,
  values: UpdateClientPayload,
): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(toApiUpdatePayload(values)),
    ...authHeaders(),
  });
}

export async function deleteClient(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/clients/${id}`, {
    method: "DELETE",
    ...authHeaders(),
  });
}

export async function fetchClientInstallments(
  clientId: string,
): Promise<ClientInstallment[]> {
  return apiFetch<ClientInstallment[]>(
    `/clients/${clientId}/installments`,
    authHeaders(),
  );
}

export async function fetchClientPayments(
  clientId: string,
): Promise<ClientPayment[]> {
  return apiFetch<ClientPayment[]>(
    `/clients/${clientId}/payments`,
    authHeaders(),
  );
}

export async function fetchClientRoutes(
  clientId: string,
): Promise<ClientRoute[]> {
  return apiFetch<ClientRoute[]>(
    `/clients/${clientId}/routes`,
    authHeaders(),
  );
}

export async function replaceClientRoutes(
  clientId: string,
  routeIds: string[],
): Promise<ClientRoute[]> {
  return apiFetch<ClientRoute[]>(`/clients/${clientId}/routes`, {
    method: "PUT",
    body: JSON.stringify({ routeIds }),
    ...authHeaders(),
  });
}
