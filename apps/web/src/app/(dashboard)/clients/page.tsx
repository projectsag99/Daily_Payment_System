"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import { createClient, fetchClients } from "@/lib/api/clients";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  ClientStatus,
} from "@/lib/constants";
import {
  CreateClientFormValues,
  createClientSchema,
} from "@/lib/schemas/auth.schema";
import { btnPrimary, btnSecondary, emptyState, inputClass, labelClass, linkClass, pageSubtitle, pageTitle, tableShell } from "@/lib/ui-classes";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["clients", page, search, status],
    queryFn: () =>
      fetchClients({
        page,
        limit: 20,
        q: search || undefined,
        status: status || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      setFeedback("Cliente creado correctamente.");
      setShowCreate(false);
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const clients = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={pageTitle}>Clientes</h1>
          <p className={pageSubtitle}>Administra la cartera de clientes del sistema.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className={btnPrimary}>
          Nuevo cliente
        </button>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      <form
        className="mb-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, código…"
          className={inputClass}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ClientStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Buscar
        </button>
      </form>

      {isLoading && (
        <p className="text-sm text-slate-600">Cargando clientes…</p>
      )}

      {error && (
        <Alert variant="error">
          {error instanceof ApiError
            ? error.message
            : "No se pudieron cargar los clientes"}
        </Alert>
      )}

      {!isLoading && !error && clients.length === 0 && (
        <div className={emptyState}>
          {search || status
            ? "No hay clientes que coincidan con la búsqueda."
            : "No hay clientes registrados."}
        </div>
      )}

      {clients.length > 0 && (
        <div className={tableShell}>
          <table>
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Créditos</th>
                <th className="px-4 py-3 font-medium">Vencidas</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{client.code}</td>
                  <td className="px-4 py-3">{client.fullName}</td>
                  <td className="px-4 py-3">
                    {CLIENT_STATUS_LABELS[client.status]}
                  </td>
                  <td className="px-4 py-3">{client.activeCreditsCount}</td>
                  <td className="px-4 py-3">
                    {client.overdueInstallmentsCount > 0 ? (
                      <span className="text-red-600">
                        {client.overdueInstallmentsCount}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/clients/${client.id}`}
                      className={linkClass}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateClientModal
          isSubmitting={createMutation.isPending}
          error={createMutation.error}
          onClose={() => setShowCreate(false)}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      )}
    </div>
  );
}

function CreateClientModal({
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (values: CreateClientFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
  });

  return (
    <Modal title="Nuevo cliente" onClose={onClose} wide>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Código *" error={errors.code?.message}>
          <input className={inputClass} {...register("code")} />
        </Field>
        <Field label="Cédula" error={errors.nationalId?.message}>
          <input className={inputClass} {...register("nationalId")} />
        </Field>
        <Field label="Nombre *" error={errors.firstName?.message}>
          <input className={inputClass} {...register("firstName")} />
        </Field>
        <Field label="Apellido *" error={errors.lastName?.message}>
          <input className={inputClass} {...register("lastName")} />
        </Field>
        <Field label="Teléfono" error={errors.phone?.message}>
          <input className={inputClass} {...register("phone")} />
        </Field>
        <Field label="Correo" error={errors.email?.message}>
          <input className={inputClass} type="email" {...register("email")} />
        </Field>
        <Field label="Dirección" className="sm:col-span-2">
          <input className={inputClass} {...register("addressLine")} />
        </Field>
        <Field label="Ciudad">
          <input className={inputClass} {...register("city")} />
        </Field>
        <Field label="Latitud">
          <input className={inputClass} type="number" step="any" {...register("lat")} />
        </Field>
        <Field label="Longitud">
          <input className={inputClass} type="number" step="any" {...register("lng")} />
        </Field>
        <Field label="Notas" className="sm:col-span-2">
          <textarea rows={2} className={inputClass} {...register("notes")} />
        </Field>

        {error && (
          <div className="sm:col-span-2">
            <Alert variant="error">
              {error instanceof ApiError ? error.message : "Error al crear"}
            </Alert>
          </div>
        )}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Guardando…" : "Crear cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
