import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import {
  CreateCreditFormValues,
  RegenerateInstallmentsFormValues,
} from "@/lib/schemas/auth.schema";
import { Credit, Installment } from "@/lib/types/credits";

export async function createCredit(
  clientId: string,
  values: CreateCreditFormValues,
): Promise<Credit> {
  return apiFetch<Credit>(`/clients/${clientId}/credits`, {
    method: "POST",
    body: JSON.stringify(values),
    ...authHeaders(),
  });
}

export async function fetchCredit(id: string): Promise<Credit> {
  return apiFetch<Credit>(`/credits/${id}`, authHeaders());
}

export async function fetchCreditInstallments(
  id: string,
): Promise<Installment[]> {
  return apiFetch<Installment[]>(`/credits/${id}/installments`, authHeaders());
}

export async function regenerateInstallments(
  id: string,
  values: RegenerateInstallmentsFormValues,
): Promise<Installment[]> {
  return apiFetch<Installment[]>(`/credits/${id}/installments/regenerate`, {
    method: "POST",
    body: JSON.stringify(values),
    ...authHeaders(),
  });
}
