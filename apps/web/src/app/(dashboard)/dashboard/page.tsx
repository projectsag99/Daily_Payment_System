"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { fetchClients } from "@/lib/api/clients";
import { fetchCollectors } from "@/lib/api/collectors";
import { fetchPayments } from "@/lib/api/payments";
import { fetchRoutes } from "@/lib/api/routes";
import { formatMoney } from "@/lib/utils/format";
import { linkClass, pageSubtitle, pageTitle } from "@/lib/ui-classes";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function DashboardPage() {
  const [clientsQ, pendingQ, activeQ, routesQ, paymentsQ] = useQueries({
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
    ],
  });

  const hasError = [clientsQ, pendingQ, activeQ, routesQ, paymentsQ].some(
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

  return (
    <div>
      <div className="mb-6">
        <h1 className={pageTitle}>Panel de control</h1>
        <p className={pageSubtitle}>Resumen operativo del sistema de cobranza.</p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Cobros de hoy</h2>
            <Link href="/pagos" className={`text-sm ${linkClass}`}>
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

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Accesos rápidos</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/clients" className={linkClass}>
                Gestionar clientes
              </Link>
            </li>
            <li>
              <Link href="/routes" className={linkClass}>
                Planificar rutas
              </Link>
            </li>
            <li>
              <Link href="/caja" className={linkClass}>
                Consultar caja
              </Link>
            </li>
            <li>
              <Link href="/rules" className={linkClass}>
                Configurar reglas de negocio
              </Link>
            </li>
          </ul>
        </div>
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
      className={`card-interactive block p-5 ${
        highlight ? "border-amber-300 bg-amber-50/80" : ""
      }`}
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </Link>
  );
}
