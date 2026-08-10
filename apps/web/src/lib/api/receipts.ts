import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import {
  ReceiptDownloadUrl,
  ReceiptLinkSummary,
  ReceiptMetadata,
  ReceiptPublicView,
} from "@/lib/types/receipts";

export async function fetchPublicReceipt(
  token: string,
): Promise<ReceiptPublicView> {
  return apiFetch<ReceiptPublicView>(`/public/receipts/${token}`);
}

export async function fetchReceipt(id: string): Promise<ReceiptMetadata> {
  return apiFetch<ReceiptMetadata>(`/receipts/${id}`, authHeaders());
}

export async function fetchReceiptDownloadUrl(
  id: string,
): Promise<ReceiptDownloadUrl> {
  return apiFetch<ReceiptDownloadUrl>(
    `/receipts/${id}/download-url`,
    authHeaders(),
  );
}

export async function createReceiptLink(
  id: string,
  expiresInDays = 90,
): Promise<ReceiptLinkSummary> {
  return apiFetch<ReceiptLinkSummary>(`/receipts/${id}/links`, {
    method: "POST",
    body: JSON.stringify({ expiresInDays }),
    ...authHeaders(),
  });
}

export async function fetchReceiptLinks(
  id: string,
): Promise<ReceiptLinkSummary[]> {
  return apiFetch<ReceiptLinkSummary[]>(`/receipts/${id}/links`, authHeaders());
}

export async function revokeReceiptLink(
  receiptId: string,
  linkId: string,
): Promise<ReceiptLinkSummary> {
  return apiFetch<ReceiptLinkSummary>(
    `/receipts/${receiptId}/links/${linkId}/revoke`,
    { method: "PATCH", ...authHeaders() },
  );
}
