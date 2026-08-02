import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import { ClientStatus } from "@/lib/constants";
import {
  CreateClientFormValues,
  UpdateClientFormValues,
} from "@/lib/schemas/auth.schema";
import {
  Client,
  ClientInstallment,
  ClientPayment,
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

function toCreatePayload(values: CreateClientFormValues) {
  const { lat, lng, email, ...rest } = values;
  return {
    ...rest,
    email: email || undefined,
    location:
      lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
  };
}

export async function fetchClients(
  params: ListClientsParams = {},
): Promise<PaginatedClients> {
  return apiFetch<PaginatedClients>(`/clients${toQuery(params)}`, authHeaders());
}

export async function fetchClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, authHeaders());
}

export async function createClient(
  values: CreateClientFormValues,
): Promise<Client> {
  return apiFetch<Client>("/clients", {
    method: "POST",
    body: JSON.stringify(toCreatePayload(values)),
    ...authHeaders(),
  });
}

export async function updateClient(
  id: string,
  values: UpdateClientFormValues,
): Promise<Client> {
  const { lat, lng, email, ...rest } = values;
  const payload: Record<string, unknown> = { ...rest };
  if (email !== undefined) payload.email = email || null;
  if (lat !== undefined && lng !== undefined) {
    payload.location = { lat, lng };
  }
  return apiFetch<Client>(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
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
