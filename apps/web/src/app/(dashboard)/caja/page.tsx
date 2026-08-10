"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api-client";
import {
  fetchCashBoxInitialBalance,
  fetchCashBoxSpreadsheet,
  fetchCashBoxSummary,
  setCashBoxInitialBalance,
} from "@/lib/api/cash-box";
import { fetchActiveCollectors } from "@/lib/api/collectors";
import { formatMoney } from "@/lib/utils/format";
import { btnPrimary, emptyState, inputClass, pageSubtitle, pageTitle } from "@/lib/ui-classes";

function currentMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export default function CajaPage() {
  const queryClient = useQueryClient();
  const [collectorId, setCollectorId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [baseAmount, setBaseAmount] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const collectorsQuery = useQuery({
    queryKey: ["collectors", "active"],
    queryFn: fetchActiveCollectors,
  });

  const activeCollectors = collectorsQuery.data ?? [];
  const selectedCollectorId =
    collectorId || activeCollectors[0]?.userId || "";

  const summaryQuery = useQuery({
    queryKey: ["cash-box-summary", selectedCollectorId],
    queryFn: () => fetchCashBoxSummary({ collectorId: selectedCollectorId }),
    enabled: Boolean(selectedCollectorId),
  });

  const spreadsheetQuery = useQuery({
    queryKey: ["cash-box-spreadsheet", selectedCollectorId, month],
    queryFn: () =>
      fetchCashBoxSpreadsheet({
        collectorId: selectedCollectorId,
        month,
      }),
    enabled: Boolean(selectedCollectorId),
  });

  const initialBalanceQuery = useQuery({
    queryKey: ["cash-box-initial-balance", selectedCollectorId],
    queryFn: () => fetchCashBoxInitialBalance(selectedCollectorId),
    enabled: Boolean(selectedCollectorId),
  });

  const setBalanceMutation = useMutation({
    mutationFn: setCashBoxInitialBalance,
    onSuccess: () => {
      setFeedback("Base inicial actualizada.");
      void queryClient.invalidateQueries({ queryKey: ["cash-box-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["cash-box-spreadsheet"] });
      void queryClient.invalidateQueries({
        queryKey: ["cash-box-initial-balance"],
      });
    },
  });

  const spreadsheet = spreadsheetQuery.data;
  const summary = summaryQuery.data;

  const selectedCollector = useMemo(
    () => activeCollectors.find((c) => c.userId === selectedCollectorId),
    [activeCollectors, selectedCollectorId],
  );

  const loadError =
    collectorsQuery.error ??
    summaryQuery.error ??
    spreadsheetQuery.error ??
    initialBalanceQuery.error;

  return (
    <div>
      <div className="mb-6">
        <h1 className={pageTitle}>Caja</h1>
        <p className={pageSubtitle}>
          Resumen de cobros, salidas y base de caja por cobrador.
        </p>
      </div>

      {feedback && (
        <div className="mb-4">
          <Alert variant="success">{feedback}</Alert>
        </div>
      )}

      {loadError && (
        <div className="mb-4">
          <Alert variant="error">
            {loadError instanceof ApiError
              ? loadError.message
              : "No se pudo cargar la información de caja"}
          </Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Cobrador
          </label>
          <select
            value={selectedCollectorId}
            onChange={(e) => setCollectorId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={collectorsQuery.isLoading || activeCollectors.length === 0}
          >
            {activeCollectors.length === 0 ? (
              <option value="">Sin cobradores activos</option>
            ) : (
              activeCollectors.map((collector) => (
                <option key={collector.userId} value={collector.userId}>
                  {collector.firstName} {collector.lastName}
                  {collector.employeeCode ? ` (${collector.employeeCode})` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Mes
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl bg-brand-50 px-4 py-3 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            Total en caja
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-900">
            {spreadsheetQuery.isLoading
              ? "…"
              : formatMoney(spreadsheet?.summary.totalEnCaja ?? 0)}
          </p>
          {selectedCollector && (
            <p className="mt-1 text-xs text-brand-800/80">
              {selectedCollector.firstName} {selectedCollector.lastName}
            </p>
          )}
        </div>
      </div>

      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Base inicial"
            value={formatMoney(summary.summary.initialBalance)}
          />
          <StatCard
            label="Cobrado (30 días)"
            value={formatMoney(summary.summary.totalCollected)}
          />
          <StatCard
            label="Renovaciones / préstamos"
            value={formatMoney(summary.summary.totalRenewalsOut)}
          />
          <StatCard
            label="Gastos logísticos"
            value={formatMoney(summary.summary.totalExpenses)}
          />
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
        <h2 className="text-sm font-semibold text-slate-900">Base inicial</h2>
        <p className="mt-1 text-xs text-slate-500">
          Monto con el que arranca el cobrador en caja.
          {initialBalanceQuery.data
            ? ` Actual: ${formatMoney(initialBalanceQuery.data.amount)}`
            : ""}
        </p>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedCollectorId) return;
            const amount = Number(baseAmount);
            if (!Number.isFinite(amount) || amount < 0) return;
            setFeedback(null);
            setBalanceMutation.mutate({
              collectorId: selectedCollectorId,
              amount,
              notes: baseNotes.trim() || undefined,
            });
          }}
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nuevo monto
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="500000"
            />
          </div>
          <div className="flex-[2]">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notas (opcional)
            </label>
            <input
              value={baseNotes}
              onChange={(e) => setBaseNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!selectedCollectorId || setBalanceMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {setBalanceMutation.isPending ? "Guardando…" : "Actualizar base"}
          </button>
        </form>
        {setBalanceMutation.error && (
          <p className="mt-2 text-sm text-red-600">
            {setBalanceMutation.error instanceof ApiError
              ? setBalanceMutation.error.message
              : "No se pudo actualizar la base"}
          </p>
        )}
      </div>

      {spreadsheetQuery.isLoading && (
        <p className="text-sm text-slate-600">Cargando planilla…</p>
      )}

      {spreadsheet && spreadsheet.rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {spreadsheet.title}
            </h2>
            <p className="text-xs text-slate-500">
              {spreadsheet.from} — {spreadsheet.to}
            </p>
          </div>
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Base</th>
                {spreadsheet.routes.map((route) => (
                  <th key={`in-${route.id}`} className="px-3 py-2 font-medium">
                    Ent. {route.name}
                  </th>
                ))}
                {spreadsheet.routes.map((route) => (
                  <th key={`out-${route.id}`} className="px-3 py-2 font-medium">
                    Sal. {route.name}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Sal. oficina</th>
                <th className="px-3 py-2 font-medium">Especificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spreadsheet.rows.map((row) => (
                <tr
                  key={row.date}
                  className={
                    row.inactive
                      ? "bg-slate-50/80 text-slate-400"
                      : "hover:bg-slate-50"
                  }
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-medium">{row.dateLabel}</div>
                    <div className="text-[10px] uppercase">{row.dayName}</div>
                  </td>
                  <td className="px-3 py-2">{formatMoney(row.base)}</td>
                  {spreadsheet.routes.map((route) => (
                    <td key={`${row.date}-in-${route.id}`} className="px-3 py-2">
                      {row.inactive ? "—" : formatMoney(row.entradas[route.id] ?? 0)}
                    </td>
                  ))}
                  {spreadsheet.routes.map((route) => (
                    <td key={`${row.date}-out-${route.id}`} className="px-3 py-2">
                      {row.inactive ? "—" : formatMoney(row.salidas[route.id] ?? 0)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {row.inactive ? "—" : formatMoney(row.salidaOficina)}
                  </td>
                  <td className="max-w-[12rem] truncate px-3 py-2">
                    {row.especificacion || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {spreadsheet && spreadsheet.rows.length === 0 && !spreadsheetQuery.isLoading && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
          No hay movimientos de caja para el mes seleccionado.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
