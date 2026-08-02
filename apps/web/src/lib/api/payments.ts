import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import {
  CreatePaymentPayload,
  CreatePaymentResponse,
  ListPaymentsParams,
  PaginatedPayments,
  PaymentDetail,
} from "@/lib/types/payments";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toQuery(params: ListPaymentsParams): string {
  const search = new URLSearchParams();
  if (params.clientId) search.set("clientId", params.clientId);
  if (params.collectorId) search.set("collectorId", params.collectorId);
  if (params.status) search.set("status", params.status);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<CreatePaymentResponse> {
  const { token } = authHeaders();
  return apiFetch<CreatePaymentResponse>("/payments", {
    method: "POST",
    token,
    headers: {
      "Idempotency-Key": newIdempotencyKey(),
      "X-Device-Id": "web-collector",
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchPayments(
  params: ListPaymentsParams = {},
): Promise<PaginatedPayments> {
  return apiFetch<PaginatedPayments>(
    `/payments${toQuery(params)}`,
    authHeaders(),
  );
}

export async function fetchPayment(id: string): Promise<PaymentDetail> {
  return apiFetch<PaymentDetail>(`/payments/${id}`, authHeaders());
}

export async function reversePayment(
  id: string,
  reason: string,
): Promise<PaymentDetail> {
  return apiFetch<PaymentDetail>(`/payments/${id}/reverse`, {
    method: "POST",
    body: JSON.stringify({ reason }),
    ...authHeaders(),
  });
}
