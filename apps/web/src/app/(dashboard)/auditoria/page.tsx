"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api-client";
import { fetchAuditLogs } from "@/lib/api/audit";
import { formatDateTime } from "@/lib/utils/format";
import { linkClass, pageSubtitle, pageTitle } from "@/lib/ui-classes";

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", page, entityType, action],
    queryFn: () =>
      fetchAuditLogs({
        page,
        limit: 25,
        entityType: entityType || undefined,
        action: action || undefined,
      }),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="mb-6">
        <Link href="/ajustes" className={`text-sm ${linkClass}`}>
          ← Ajustes
        </Link>
        <h1 className={`${pageTitle} mt-2`}>Auditoría</h1>
        <p className={pageSubtitle}>
          Registro inmutable de acciones administrativas y de dominio.
        </p>
      </div>

      <form
        className="mb-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <input
          type="text"
          placeholder="Tipo de entidad (ej. payment)"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Acción (ej. payment.reversed)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Filtrar
        </button>
      </form>

      {isLoading && <p className="text-sm text-slate-600">Cargando auditoría…</p>}

      {error && (
        <Alert variant="error">
          {error instanceof ApiError ? error.message : "Error al cargar auditoría"}
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    {log.entityType}
                    {log.entityId && (
                      <span className="block text-xs text-slate-500">
                        {log.entityId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {log.actorId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-500">Sin registros.</p>
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Página {meta.page} de {meta.totalPages}
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
    </div>
  );
}
