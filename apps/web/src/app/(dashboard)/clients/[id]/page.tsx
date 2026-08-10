"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { ClientProfileForm } from "@/components/client-profile-form";
import { ClientRoutesSection } from "@/components/client-routes-section";
import { CreateCreditModal } from "@/components/create-credit-modal";
import { ApiError } from "@/lib/api-client";
import {
  fetchClient,
  fetchClientInstallments,
  fetchClientPayments,
  updateClient,
} from "@/lib/api/clients";
import {
  CLIENT_STATUS_LABELS,
} from "@/lib/constants";
import {
  UpdateClientFormValues,
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

  function handleCreditCreated() {
    setShowCredit(false);
    setFeedback("Crédito creado correctamente.");
    void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    void queryClient.invalidateQueries({
      queryKey: ["client-installments", clientId],
    });
  }

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
        <div className="space-y-6">
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
          <ClientRoutesSection clientId={clientId} />
        </div>

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
                    <td className="py-2 pr-4">{formatMoney(row.amountDue, row.currency)}</td>
                    <td className="py-2 pr-4">{formatMoney(row.amountPaid, row.currency)}</td>
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
                    <td className="py-2 pr-4">{formatMoney(row.amount, row.currency)}</td>
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

      {showCredit && client && (
        <CreateCreditModal
          clientId={clientId}
          clientCountry={client.country}
          onClose={() => setShowCredit(false)}
          onSuccess={handleCreditCreated}
        />
      )}
    </div>
  );
}

const btnPrimary = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

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
