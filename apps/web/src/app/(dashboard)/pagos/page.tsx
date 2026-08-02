"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import { fetchPayment, fetchPayments, reversePayment } from "@/lib/api/payments";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/constants";
import {
  ReversePaymentFormValues,
  reversePaymentSchema,
} from "@/lib/schemas/auth.schema";
import { PaymentSummary } from "@/lib/types/payments";
import { formatDateTime, formatMoney } from "@/lib/utils/format";

export default function PagosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<PaymentSummary | null>(null);
  const [showReverse, setShowReverse] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["payments", page, status, from, to],
    queryFn: () =>
      fetchPayments({
        page,
        limit: 20,
        status: status || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ["payment", selected?.id],
    queryFn: () => fetchPayment(selected!.id),
    enabled: Boolean(selected),
  });

  const reverseForm = useForm<ReversePaymentFormValues>({
    resolver: zodResolver(reversePaymentSchema),
  });

  const reverseMutation = useMutation({
    mutationFn: (values: ReversePaymentFormValues) =>
      reversePayment(selected!.id, values.reason),
    onSuccess: () => {
      setFeedback("Pago reversado correctamente.");
      setShowReverse(false);
      setSelected(null);
      reverseForm.reset();
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const payments = data?.data ?? [];
  const meta = data?.meta;
  const detail = detailQuery.data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Pagos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Registro de cobros y reversiones administrativas.
        </p>
      </div>

      {feedback && (
        <Alert variant="success">{feedback}</Alert>
      )}

      <form
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus | "")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filtrar
        </button>
      </form>

      {isLoading && <p className="text-sm text-slate-600">Cargando pagos…</p>}

      {error && (
        <Alert variant="error">
          {error instanceof ApiError ? error.message : "Error al cargar pagos"}
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(payment.recordedAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod] ??
                      payment.paymentMethod}
                  </td>
                  <td className="px-4 py-3">
                    {PAYMENT_STATUS_LABELS[payment.status as PaymentStatus] ??
                      payment.status}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${payment.clientId}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver cliente
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(payment)}
                      className="text-blue-600 hover:underline"
                    >
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">
              No hay pagos con estos filtros.
            </p>
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Página {meta.page} de {meta.totalPages} ({meta.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {selected && !showReverse && (
        <Modal title="Detalle del pago" onClose={() => setSelected(null)} wide>
          {detailQuery.isLoading && (
            <p className="text-sm text-slate-600">Cargando detalle…</p>
          )}
          {detailQuery.error && (
            <Alert variant="error">
              {detailQuery.error instanceof ApiError
                ? detailQuery.error.message
                : "No se pudo cargar el detalle"}
            </Alert>
          )}
          {detail && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-slate-600">ID:</span> {detail.id}
              </p>
              <p>
                <span className="text-slate-600">Monto:</span>{" "}
                {formatMoney(detail.amount)}
              </p>
              <p>
                <span className="text-slate-600">Estado:</span>{" "}
                {PAYMENT_STATUS_LABELS[detail.status as PaymentStatus] ??
                  detail.status}
              </p>
              <p>
                <span className="text-slate-600">Capturado:</span>{" "}
                {formatDateTime(detail.capturedAt)}
              </p>
              {detail.notes && (
                <p>
                  <span className="text-slate-600">Notas:</span> {detail.notes}
                </p>
              )}
              {detail.allocations.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">Cuotas aplicadas</p>
                  <ul className="list-inside list-disc text-slate-600">
                    {detail.allocations.map((a) => (
                      <li key={a.installmentId}>
                        #{a.installmentNumber} — {formatMoney(a.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.status === "completed" && (
                <button
                  type="button"
                  onClick={() => setShowReverse(true)}
                  className="mt-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Reversar pago
                </button>
              )}
              {detail.status === "reversed" && detail.reversalReason && (
                <p className="text-red-700">
                  Motivo reversión: {detail.reversalReason}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}

      {selected && showReverse && (
        <Modal
          title="Reversar pago"
          onClose={() => {
            setShowReverse(false);
            reverseForm.reset();
          }}
        >
          <form
            onSubmit={reverseForm.handleSubmit((values) =>
              reverseMutation.mutate(values),
            )}
            className="space-y-4"
          >
            <p className="text-sm text-slate-600">
              Esta acción es irreversible en el registro contable. Indica el motivo.
            </p>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Motivo de la reversión"
              {...reverseForm.register("reason")}
            />
            {reverseForm.formState.errors.reason && (
              <p className="text-sm text-red-600">
                {reverseForm.formState.errors.reason.message}
              </p>
            )}
            {reverseMutation.error && (
              <Alert variant="error">
                {reverseMutation.error instanceof ApiError
                  ? reverseMutation.error.message
                  : "No se pudo reversar"}
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReverse(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={reverseMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {reverseMutation.isPending ? "Reversando…" : "Confirmar reversión"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
