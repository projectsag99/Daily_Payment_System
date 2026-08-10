"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { CreateClientModal } from "@/components/create-client-modal";
import { ApiError } from "@/lib/api-client";
import { fetchClients } from "@/lib/api/clients";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  ClientStatus,
} from "@/lib/constants";
import { btnPrimary, emptyState, inputClass, linkClass, pageSubtitle, pageTitle, tableShell } from "@/lib/ui-classes";

export default function ClientsPage() {
  const router = useRouter();
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

  function handleCreateSuccess(client: { id: string; code: string }) {
    setFeedback(`Cliente y crédito creados correctamente (${client.code}).`);
    setShowCreate(false);
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
    router.push(`/clients/${client.id}`);
  }

  function handleOpenCreate() {
    setShowCreate(true);
  }

  function handleCloseCreate() {
    setShowCreate(false);
  }

  const clients = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={pageTitle}>Clientes</h1>
          <p className={pageSubtitle}>Administra la cartera de clientes del sistema.</p>
        </div>
        <button type="button" onClick={handleOpenCreate} className={btnPrimary}>
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
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {client.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {client.fullName}
                    </Link>
                  </td>
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
          onClose={handleCloseCreate}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
