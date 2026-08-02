"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api-client";
import {
  fetchNotifications,
  markNotificationRead,
} from "@/lib/api/notifications";
import { formatDateTime } from "@/lib/utils/format";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(1, 50),
  });

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Notificaciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Alertas generadas por reglas de negocio y eventos del sistema.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-slate-600">Cargando notificaciones…</p>
      )}

      {error && (
        <Alert variant="error">
          {error instanceof ApiError
            ? error.message
            : "No se pudieron cargar las notificaciones"}
        </Alert>
      )}

      {!isLoading && !error && notifications.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
          No tienes notificaciones.
        </div>
      )}

      <ul className="space-y-3">
        {notifications.map((item) => (
          <li
            key={item.id}
            className={`rounded-xl border p-4 shadow-sm ${
              item.readAt
                ? "border-slate-200 bg-white"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-700">{item.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {formatDateTime(item.createdAt)} · {item.channel} ·{" "}
                  {item.status}
                </p>
              </div>
              {!item.readAt && (
                <button
                  type="button"
                  disabled={readMutation.isPending}
                  onClick={() => readMutation.mutate(item.id)}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-xs hover:bg-white"
                >
                  Marcar leída
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
