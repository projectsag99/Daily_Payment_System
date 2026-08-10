"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ClientProfileForm } from "@/components/client-profile-form";
import { ApiError } from "@/lib/api-client";
import {
  fetchClient,
  fetchClientInstallments,
  fetchClientPayments,
  updateClient,
} from "@/lib/api/clients";
import { createCredit } from "@/lib/api/credits";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
} from "@/lib/constants";
import {
  CreateCreditFormValues,
  UpdateClientFormValues,
  createCreditSchema,
  updateClientSchema,
  toUpdateClientPayload,
} from "@/lib/schemas/auth.schema";
import {
  routeFormLocationValues,
  stripCountryPhonePrefix,
} from "@/lib/constants/route-locations";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils/format";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const queryClient = useQueryClient();
  const [showCredit, setShowCredit] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClient(clientId),
  });

  const installmentsQuery = useQuery({
    queryKey: ["client-installments", clientId],
    queryFn: () => fetchClientInstallments(clientId),
  });

  const paymentsQuery = useQuery({
    queryKey: ["client-payments", clientId],
    queryFn: () => fetchClientPayments(clientId),
  });

  const updateMutation = useMutation({
    mutationFn: (values: UpdateClientFormValues) =>
      updateClient(clientId, toUpdateClientPayload(values)),
    onSuccess: () => {
      setFeedback("Cliente actualizado.");
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    },
  });

  const creditMutation = useMutation({
    mutationFn: (values: CreateCreditFormValues) =>
      createCredit(clientId, values),
    onSuccess: (credit) => {
      setShowCredit(false);
      setFeedback(`Crédito creado (${credit.id.slice(0, 8)}…).`);
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      void queryClient.invalidateQueries({
        queryKey: ["client-installments", clientId],
      });
    },
  });

  const client = clientQuery.data;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateClientFormValues>({
    resolver: zodResolver(updateClientSchema),
    values: client
      ? {
          firstName: client.firstName,
          lastName: client.lastName,
          nationalId: client.nationalId ?? "",
          phoneLocal: stripCountryPhonePrefix(
            client.phone ?? "",
            client.country ?? undefined,
          ),
          email: client.email ?? "",
          addressLine: client.addressLine ?? "",
          ...routeFormLocationValues({
            country: client.country,
            department: client.department,
            city: client.city,
          }),
          lat: client.location?.lat,
          lng: client.location?.lng,
          status: client.status,
          notes: client.notes ?? "",
        }
      : undefined,
  });

  if (clientQuery.isLoading) {
    return <p className="text-sm text-slate-600">Cargando cliente…</p>;
  }

  if (clientQuery.error || !client) {
    return (
      <Alert variant="error">
        {clientQuery.error instanceof ApiError
          ? clientQuery.error.message
          : "Cliente no encontrado"}
      </Alert>
    );
  }

  const creditIds = [
    ...new Set((installmentsQuery.data ?? []).map((i) => i.creditId)),
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-brand-600 hover:underline">
          ← Volver a clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {client.fullName}
        </h1>
        <p className="text-sm text-slate-600">
          {client.code} · {CLIENT_STATUS_LABELS[client.status]}
        </p>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <ClientProfileForm
          client={client}
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
          isDirty={isDirty}
          isSubmitting={updateMutation.isPending}
          submitError={
            updateMutation.error instanceof ApiError
              ? updateMutation.error.message
              : updateMutation.error
                ? "Error al guardar"
                : null
          }
          onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
        />

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Créditos</h2>
            <button
              type="button"
              onClick={() => setShowCredit(true)}
              className={btnPrimary}
            >
              Nuevo crédito
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Créditos activos" value={client.activeCreditsCount} />
            <Stat
              label="Cuotas vencidas"
              value={client.overdueInstallmentsCount}
              danger={client.overdueInstallmentsCount > 0}
            />
          </dl>
          {creditIds.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {creditIds.map((creditId) => (
                <li key={creditId}>
                  <Link
                    href={`/credits/${creditId}`}
                    className="text-brand-600 hover:underline"
                  >
                    Crédito {creditId.slice(0, 8)}…
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Cuotas abiertas</h2>
        {installmentsQuery.isLoading ? (
          <p className="text-sm text-slate-600">Cargando…</p>
        ) : (installmentsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-600">Sin cuotas pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Vence</th>
                  <th className="pb-2 pr-4">Debe</th>
                  <th className="pb-2 pr-4">Pagado</th>
                  <th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installmentsQuery.data?.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4">{row.installmentNumber}</td>
                    <td className="py-2 pr-4">{formatDate(row.dueDate)}</td>
                    <td className="py-2 pr-4">{formatMoney(row.amountDue)}</td>
                    <td className="py-2 pr-4">{formatMoney(row.amountPaid)}</td>
                    <td className="py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Pagos recientes</h2>
        {paymentsQuery.isLoading ? (
          <p className="text-sm text-slate-600">Cargando…</p>
        ) : (paymentsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-600">Sin pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="pb-2 pr-4">Monto</th>
                  <th className="pb-2 pr-4">Método</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsQuery.data?.slice(0, 10).map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4">{formatMoney(row.amount)}</td>
                    <td className="py-2 pr-4">{row.paymentMethod}</td>
                    <td className="py-2 pr-4">{row.status}</td>
                    <td className="py-2">{formatDateTime(row.recordedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCredit && (
        <CreateCreditModal
          isSubmitting={creditMutation.isPending}
          error={creditMutation.error}
          onClose={() => setShowCredit(false)}
          onSubmit={(values) => creditMutation.mutate(values)}
        />
      )}
    </div>
  );
}

function CreateCreditModal({
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (values: CreateCreditFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCreditFormValues>({
    resolver: zodResolver(createCreditSchema),
    defaultValues: {
      startDate: new Date().toISOString().slice(0, 10),
      totalInstallments: 30,
    },
  });

  return (
    <Modal title="Nuevo crédito" onClose={onClose} wide>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Input label="Monto principal *" type="number" step="0.01" error={errors.principalAmount?.message} {...register("principalAmount")} />
        <Input label="Cuotas *" type="number" error={errors.totalInstallments?.message} {...register("totalInstallments")} />
        <Input label="Valor cuota *" type="number" step="0.01" error={errors.installmentAmount?.message} {...register("installmentAmount")} />
        <Input label="Fecha inicio *" type="date" error={errors.startDate?.message} {...register("startDate")} />
        <Input label="Tasa interés" type="number" step="0.0001" {...register("interestRate")} />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
          <textarea rows={2} className={inputClass} {...register("notes")} />
        </div>
        {error && (
          <div className="sm:col-span-2">
            <Alert variant="error">
              {error instanceof ApiError ? error.message : "Error al crear crédito"}
            </Alert>
          </div>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Creando…" : "Crear crédito"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const btnPrimary = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60";
const btnSecondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm";

function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input className={inputClass} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select className={inputClass} {...props}>{children}</select>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-lg font-semibold ${danger ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </dd>
    </div>
  );
}
