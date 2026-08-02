"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { RecordPaymentModal } from "@/components/payments/record-payment-modal";
import { ApiError } from "@/lib/api-client";
import { createReceiptLink } from "@/lib/api/receipts";
import { fetchMyRoutes } from "@/lib/api/routes";
import { useAuth } from "@/lib/auth/auth-context";
import {
  SHIFT_LABELS,
  VISIT_STATUS_LABELS,
  VisitStatus,
} from "@/lib/constants";
import { CreatePaymentResponse } from "@/lib/types/payments";
import { RouteClient } from "@/lib/types/routes";
import { formatMoney } from "@/lib/utils/format";

function visitLabel(status: string): string {
  return VISIT_STATUS_LABELS[status as VisitStatus] ?? status;
}

export default function MyRoutesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<RouteClient | null>(
    null,
  );
  const [lastPayment, setLastPayment] = useState<CreatePaymentResponse | null>(
    null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const linkMutation = useMutation({
    mutationFn: (receiptId: string) => createReceiptLink(receiptId),
    onSuccess: (link) => setShareUrl(link.publicUrl),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-routes"],
    queryFn: () => fetchMyRoutes(),
  });

  const routes = data ?? [];

  function handlePaymentSuccess(result: CreatePaymentResponse) {
    setSelectedClient(null);
    setLastPayment(result);
    setShareUrl(null);
    void queryClient.invalidateQueries({ queryKey: ["my-routes"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Mi ruta del día
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {user
              ? `Hola, ${user.firstName}. Clientes asignados para hoy.`
              : "Clientes asignados para hoy."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Actualizar
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-slate-600">Cargando rutas…</p>
      )}

      {error && (
        <Alert variant="error">
          {error instanceof ApiError
            ? error.message
            : "No se pudieron cargar tus rutas"}
        </Alert>
      )}

      {!isLoading && !error && routes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
          No tienes rutas asignadas para hoy.
        </div>
      )}

      <ul className="space-y-4">
        {routes.map((route) => (
          <li
            key={route.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {route.name}
                </h2>
                <p className="text-sm text-slate-600">
                  Turno {SHIFT_LABELS[route.shift]} · {route.clients.length}{" "}
                  clientes
                </p>
              </div>
              {route.collectedTodayPct != null && (
                <span className="text-sm text-slate-600">
                  {route.collectedTodayPct.toFixed(0)}% cobrado hoy
                </span>
              )}
            </div>

            {route.clients.length === 0 ? (
              <p className="text-sm text-slate-500">Sin clientes en esta ruta.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Estado visita</th>
                      <th className="px-3 py-2">A cobrar</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {route.clients.map((client) => (
                      <tr key={client.id}>
                        <td className="px-3 py-2">{client.sequenceOrder}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{client.fullName}</p>
                          <p className="text-xs text-slate-500">{client.code}</p>
                        </td>
                        <td className="px-3 py-2">
                          {visitLabel(client.visitStatus)}
                        </td>
                        <td className="px-3 py-2">
                          {formatMoney(client.amountDue)}
                          {client.overdueInstallmentCount > 0 && (
                            <span className="ml-1 text-xs text-red-600">
                              ({client.overdueInstallmentCount} venc.)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedClient(client)}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Registrar pago
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        ))}
      </ul>

      {selectedClient && (
        <RecordPaymentModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {lastPayment && (
        <Modal
          title="Pago registrado"
          onClose={() => {
            setLastPayment(null);
            setShareUrl(null);
          }}
        >
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Monto:{" "}
              <span className="font-semibold">
                {formatMoney(lastPayment.amount)}
              </span>
            </p>
            <p>
              Estado del pago:{" "}
              <span className="font-medium">{lastPayment.status}</span>
            </p>
            <p>
              Visita actualizada:{" "}
              <span className="font-medium">
                {visitLabel(lastPayment.clientVisitStatus)}
              </span>
            </p>
            {lastPayment.allocations.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Cuotas aplicadas:</p>
                <ul className="list-inside list-disc text-slate-600">
                  {lastPayment.allocations.map((item) => (
                    <li key={item.installmentId}>
                      Cuota #{item.installmentNumber} —{" "}
                      {formatMoney(item.amount)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lastPayment.receipt && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-600">
                  Recibo #{lastPayment.receipt.id.slice(0, 8)}… (
                  {lastPayment.receipt.status})
                </p>
                {!shareUrl && (
                  <button
                    type="button"
                    disabled={linkMutation.isPending}
                    onClick={() => linkMutation.mutate(lastPayment.receipt.id)}
                    className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    {linkMutation.isPending
                      ? "Generando enlace…"
                      : "Generar enlace para compartir"}
                  </button>
                )}
                {linkMutation.error && (
                  <p className="mt-1 text-sm text-red-600">
                    {linkMutation.error instanceof ApiError
                      ? linkMutation.error.message
                      : "No se pudo crear el enlace"}
                  </p>
                )}
                {shareUrl && (
                  <p className="mt-2 break-all text-xs text-slate-700">
                    {shareUrl}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            {shareUrl && (
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(shareUrl)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Copiar enlace
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setLastPayment(null);
                setShareUrl(null);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
