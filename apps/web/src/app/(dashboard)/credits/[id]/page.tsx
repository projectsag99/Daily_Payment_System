"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import {
  fetchCredit,
  fetchCreditInstallments,
  regenerateInstallments,
} from "@/lib/api/credits";
import { CREDIT_STATUS_LABELS } from "@/lib/constants";
import {
  RegenerateInstallmentsFormValues,
  regenerateInstallmentsSchema,
} from "@/lib/schemas/auth.schema";
import { formatDate, formatMoney } from "@/lib/utils/format";

export default function CreditDetailPage() {
  const params = useParams<{ id: string }>();
  const creditId = params.id;
  const queryClient = useQueryClient();
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const creditQuery = useQuery({
    queryKey: ["credit", creditId],
    queryFn: () => fetchCredit(creditId),
  });

  const installmentsQuery = useQuery({
    queryKey: ["credit-installments", creditId],
    queryFn: () => fetchCreditInstallments(creditId),
  });

  const regenerateMutation = useMutation({
    mutationFn: (values: RegenerateInstallmentsFormValues) =>
      regenerateInstallments(creditId, values),
    onSuccess: () => {
      setShowRegenerate(false);
      setFeedback("Cuotas regeneradas correctamente.");
      void queryClient.invalidateQueries({ queryKey: ["credit", creditId] });
      void queryClient.invalidateQueries({
        queryKey: ["credit-installments", creditId],
      });
    },
  });

  const credit = creditQuery.data;

  if (creditQuery.isLoading) {
    return <p className="text-sm text-slate-600">Cargando crédito…</p>;
  }

  if (creditQuery.error || !credit) {
    return (
      <Alert variant="error">
        {creditQuery.error instanceof ApiError
          ? creditQuery.error.message
          : "Crédito no encontrado"}
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/clients/${credit.clientId}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← Volver al cliente
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Crédito — {credit.clientName}
        </h1>
        <p className="text-sm text-slate-600">
          {credit.clientCode} · {CREDIT_STATUS_LABELS[credit.status]}
          {credit.routeName ? ` · ${credit.routeName}` : ""}
          {" · "}
          {credit.currency}
        </p>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Principal" value={formatMoney(credit.principalAmount, credit.currency)} />
        <StatCard label="Pagado" value={formatMoney(credit.totalPaid, credit.currency)} />
        <StatCard label="Saldo" value={formatMoney(credit.balance, credit.currency)} />
        <StatCard
          label="Cuotas"
          value={`${credit.paidInstallments} / ${credit.totalInstallments}`}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Plan de cuotas</h2>
          <button
            type="button"
            onClick={() => setShowRegenerate(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Regenerar cuotas
          </button>
        </div>

        {installmentsQuery.isLoading ? (
          <p className="text-sm text-slate-600">Cargando cuotas…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Vence</th>
                  <th className="px-3 py-2">Debe</th>
                  <th className="px-3 py-2">Pagado</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installmentsQuery.data?.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">{row.installmentNumber}</td>
                    <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                    <td className="px-3 py-2">{formatMoney(row.amountDue, credit.currency)}</td>
                    <td className="px-3 py-2">{formatMoney(row.amountPaid, credit.currency)}</td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showRegenerate && (
        <RegenerateModal
          credit={credit}
          isSubmitting={regenerateMutation.isPending}
          error={regenerateMutation.error}
          onClose={() => setShowRegenerate(false)}
          onSubmit={(values) => regenerateMutation.mutate(values)}
        />
      )}
    </div>
  );
}

function RegenerateModal({
  credit,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  credit: { startDate: string; totalInstallments: number; installmentAmount: number };
  isSubmitting: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (values: RegenerateInstallmentsFormValues) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<RegenerateInstallmentsFormValues>({
    resolver: zodResolver(regenerateInstallmentsSchema),
    defaultValues: {
      startDate: credit.startDate.slice(0, 10),
      totalInstallments: credit.totalInstallments,
      installmentAmount: credit.installmentAmount,
    },
  });

  return (
    <Modal title="Regenerar cuotas" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        Solo disponible si el crédito no tiene pagos aplicados.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Fecha inicio</label>
          <input type="date" className={inputClass} {...register("startDate")} />
          {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Total cuotas</label>
          <input type="number" className={inputClass} {...register("totalInstallments")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Valor cuota</label>
          <input type="number" step="0.01" className={inputClass} {...register("installmentAmount")} />
        </div>
        {error && (
          <Alert variant="error">
            {error instanceof ApiError ? error.message : "Error al regenerar"}
          </Alert>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Regenerando…" : "Confirmar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const btnPrimary = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60";
const btnSecondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
