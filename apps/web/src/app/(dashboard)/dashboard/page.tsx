"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { fetchAuditLogs } from "@/lib/api/audit";
import { fetchClients } from "@/lib/api/clients";
import { fetchCollectors } from "@/lib/api/collectors";
import { fetchPayments } from "@/lib/api/payments";
import { fetchRoutes } from "@/lib/api/routes";
import { formatDateTime, formatMoney } from "@/lib/utils/format";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function DashboardPage() {
  const [clientsQ, pendingQ, activeQ, routesQ, paymentsQ, auditQ] = useQueries({
    queries: [
      {
        queryKey: ["dashboard", "clients"],
        queryFn: () => fetchClients({ limit: 1 }),
      },
      {
        queryKey: ["dashboard", "collectors-pending"],
        queryFn: () => fetchCollectors("pending"),
      },
      {
        queryKey: ["dashboard", "collectors-active"],
        queryFn: () => fetchCollectors("active"),
      },
      {
        queryKey: ["dashboard", "routes"],
        queryFn: () => fetchRoutes({ isActive: true }),
      },
      {
        queryKey: ["dashboard", "payments-today"],
        queryFn: () =>
          fetchPayments({ from: startOfTodayIso(), limit: 100, page: 1 }),
      },
      {
        queryKey: ["dashboard", "audit"],
        queryFn: () => fetchAuditLogs({ limit: 8, page: 1 }),
      },
    ],
  });

  const hasError = [clientsQ, pendingQ, activeQ, routesQ, paymentsQ, auditQ].some(
    (q) => q.error,
  );

  const clientTotal = clientsQ.data?.meta.total ?? 0;
  const pendingCollectors = pendingQ.data?.length ?? 0;
  const activeCollectors = activeQ.data?.length ?? 0;
  const routesCount = routesQ.data?.length ?? 0;
  const paymentsToday = paymentsQ.data?.data ?? [];
  const totalCollectedToday = paymentsToday
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const auditLogs = auditQ.data?.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Panel de control</h1>
        <p className="mt-1 text-sm text-slate-600">
          Resumen operativo del sistema de cobranza.
        </p>
      </div>

      {hasError && (
        <div className="mb-4">
          <Alert variant="error">
            Algunos indicadores no pudieron cargarse. Revisa la conexión con la API.
          </Alert>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes activos" value={String(clientTotal)} href="/clients" />
        <StatCard
          label="Cobradores activos"
          value={String(activeCollectors)}
          href="/collectors"
        />
        <StatCard
          label="Solicitudes pendientes"
          value={String(pendingCollectors)}
          href="/collectors"
          highlight={pendingCollectors > 0}
        />
        <StatCard label="Rutas activas" value={String(routesCount)} href="/routes" />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Cobros de hoy</h2>
            <Link href="/pagos" className="text-sm text-blue-600 hover:underline">
              Ver todos
            </Link>
          </div>
          <p className="text-3xl font-semibold text-slate-900">
            {formatMoney(totalCollectedToday)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {paymentsToday.length} pago(s) registrado(s) hoy
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Accesos rápidos</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/clients" className="text-blue-600 hover:underline">
                Gestionar clientes
              </Link>
            </li>
            <li>
              <Link href="/routes" className="text-blue-600 hover:underline">
                Planificar rutas
              </Link>
            </li>
            <li>
              <Link href="/rules" className="text-blue-600 hover:underline">
                Configurar reglas de negocio
              </Link>
            </li>
            <li>
              <Link href="/auditoria" className="text-blue-600 hover:underline">
                Consultar auditoría
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Actividad reciente</h2>
          <Link href="/auditoria" className="text-sm text-blue-600 hover:underline">
            Ver auditoría completa
          </Link>
        </div>
        {auditQ.isLoading && (
          <p className="text-sm text-slate-600">Cargando actividad…</p>
        )}
        {!auditQ.isLoading && auditLogs.length === 0 && (
          <p className="text-sm text-slate-500">Sin registros de auditoría.</p>
        )}
        {auditLogs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Acción</th>
                  <th className="pb-2 pr-4">Entidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 pr-4 text-slate-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-2 pr-4">{log.action}</td>
                    <td className="py-2 pr-4 text-slate-600">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-200 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-slate-200"
      }`}
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </Link>
  );
}
