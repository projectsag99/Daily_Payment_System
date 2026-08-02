import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/lib/api/auth";
import { PaginatedNotifications } from "@/lib/types/receipts";

export async function fetchNotifications(
  page = 1,
  limit = 20,
): Promise<PaginatedNotifications> {
  return apiFetch<PaginatedNotifications>(
    `/notifications?page=${page}&limit=${limit}`,
    authHeaders(),
  );
}

export async function markNotificationRead(id: string) {
  return apiFetch(`/notifications/${id}/read`, {
    method: "PATCH",
    ...authHeaders(),
  });
}
