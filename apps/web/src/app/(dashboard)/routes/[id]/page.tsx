"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import { fetchAssignableCollectors } from "@/lib/api/collectors";
import { fetchClients } from "@/lib/api/clients";
import {
  assignRouteCollector,
  fetchRouteClients,
  fetchRouteCollectors,
  fetchRoutes,
  removeRouteCollector,
  replaceRouteClients,
  updateRoute,
} from "@/lib/api/routes";
import {
  DAY_LABELS,
  SHIFT_LABELS,
  SHIFT_TYPES,
} from "@/lib/constants";
import {
  AssignCollectorFormValues,
  UpdateRouteFormValues,
  assignCollectorSchema,
  toUpdateRoutePayload,
  updateRouteSchema,
} from "@/lib/schemas/auth.schema";
import { CollectorSummary } from "@/lib/types/collectors";
import { formatDate } from "@/lib/utils/format";
import { collectorSelectLabel } from "@/lib/utils/collector-label";
import { RouteLocationFields, RouteLocationFieldsValues } from "@/components/route-location-fields";
import {
  formatRouteLocation,
  routeFormLocationValues,
} from "@/lib/constants/route-locations";

export default function RouteDetailPage() {
  const params = useParams<{ id: string }>();
  const routeId = params.id;
  const queryClient = useQueryClient();
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const routesQuery = useQuery({
    queryKey: ["routes"],
    queryFn: () => fetchRoutes({}),
  });

  const route = routesQuery.data?.find((r) => r.id === routeId);

  const clientsQuery = useQuery({
    queryKey: ["route-clients", routeId],
    queryFn: () => fetchRouteClients(routeId),
  });

  const allClientsQuery = useQuery({
    queryKey: ["clients-all"],
    queryFn: () => fetchClients({ limit: 100, page: 1 }),
  });

  const collectorsQuery = useQuery({
    queryKey: ["route-collectors", routeId],
    queryFn: () => fetchRouteCollectors(routeId),
  });

  const activeCollectorsQuery = useQuery({
    queryKey: ["collectors-assignable"],
    queryFn: fetchAssignableCollectors,
  });

  useEffect(() => {
    if (clientsQuery.data) {
      setOrderedIds(clientsQuery.data.map((c) => c.id));
    }
  }, [clientsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (values: UpdateRouteFormValues) =>
      updateRoute(routeId, toUpdateRoutePayload(values)),
    onSuccess: () => {
      setFeedback("Ruta actualizada.");
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const clientsMutation = useMutation({
    mutationFn: (clientIds: string[]) => replaceRouteClients(routeId, clientIds),
    onSuccess: () => {
      setFeedback("Clientes de la ruta actualizados.");
      void queryClient.invalidateQueries({ queryKey: ["route-clients", routeId] });
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (values: AssignCollectorFormValues) =>
      assignRouteCollector(routeId, values),
    onSuccess: () => {
      setShowAssign(false);
      setFeedback("Cobrador asignado.");
      void queryClient.invalidateQueries({ queryKey: ["route-collectors", routeId] });
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const removeCollectorMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      removeRouteCollector(routeId, assignmentId),
    onSuccess: () => {
      setFeedback("Asignación eliminada.");
      void queryClient.invalidateQueries({ queryKey: ["route-collectors", routeId] });
    },
  });

  const form = useForm<UpdateRouteFormValues>({
    resolver: zodResolver(updateRouteSchema),
    values: route
      ? {
          name: route.name,
          shift: route.shift,
          dayOfWeek: route.dayOfWeek,
          isActive: route.isActive,
          description: route.description ?? "",
          ...routeFormLocationValues(route),
        }
      : undefined,
  });

  if (routesQuery.isLoading) {
    return <p className="text-sm text-slate-600">Cargando ruta…</p>;
  }

  if (!route) {
    return <Alert variant="error">Ruta no encontrada</Alert>;
  }

  const allClients = allClientsQuery.data?.data ?? [];
  const clientMap = new Map(allClients.map((c) => [c.id, c]));

  function moveClient(index: number, direction: -1 | 1) {
    const next = [...orderedIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedIds(next);
  }

  function toggleClient(clientId: string) {
    setOrderedIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId],
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/routes" className="text-sm text-brand-600 hover:underline">
          ← Volver a rutas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{route.name}</h1>
        <p className="text-sm text-slate-600">
          {formatRouteLocation(route.country, route.department, route.city)}
        </p>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">Configuración</h2>
          <form
            onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
            className="space-y-3"
          >
            <Input
              label="Nombre"
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <RouteLocationFields
              register={
                form.register as unknown as UseFormRegister<RouteLocationFieldsValues>
              }
              watch={form.watch as unknown as UseFormWatch<RouteLocationFieldsValues>}
              setValue={
                form.setValue as unknown as UseFormSetValue<RouteLocationFieldsValues>
              }
              errors={
                form.formState.errors as FieldErrors<RouteLocationFieldsValues>
              }
              inputClass={inputClass}
              requireAll={false}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">Turno</label>
              <select className={inputClass} {...form.register("shift")}>
                {SHIFT_TYPES.map((s) => (
                  <option key={s} value={s}>{SHIFT_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Día</label>
              <select className={inputClass} {...form.register("dayOfWeek")}>
                <option value="">Todos</option>
                {DAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("isActive")} />
              Ruta activa
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <textarea rows={2} className={inputClass} {...form.register("description")} />
            </div>
            <button type="submit" disabled={updateMutation.isPending} className={btnPrimary}>
              {updateMutation.isPending ? "Guardando…" : "Guardar"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Cobrador responsable</h2>
            <button type="button" onClick={() => setShowAssign(true)} className={btnSecondary}>
              {(collectorsQuery.data ?? []).length > 0 ? "Cambiar" : "Asignar"}
            </button>
          </div>
          {route.assignedCollector ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="font-medium text-slate-900">{route.assignedCollector.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">Asignación vigente hoy</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Sin cobrador asignado.</p>
          )}
          {(collectorsQuery.data ?? []).length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Historial de asignaciones
              </h3>
              <ul className="space-y-2 text-sm">
                {collectorsQuery.data?.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{a.collectorName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(a.effectiveFrom)}
                        {a.effectiveTo ? ` → ${formatDate(a.effectiveTo)}` : " → indefinido"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCollectorMutation.mutate(a.id)}
                      className="text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Clientes en la ruta</h2>
          <button
            type="button"
            onClick={() => clientsMutation.mutate(orderedIds)}
            disabled={clientsMutation.isPending}
            className={btnPrimary}
          >
            {clientsMutation.isPending ? "Guardando…" : "Guardar orden"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Orden de visita</h3>
            {orderedIds.length === 0 ? (
              <p className="text-sm text-slate-600">Ningún cliente seleccionado.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {orderedIds.map((id, index) => (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span>
                      {index + 1}. {clientMap.get(id)?.fullName ?? id.slice(0, 8)}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveClient(index, -1)} className="px-2">↑</button>
                      <button type="button" onClick={() => moveClient(index, 1)} className="px-2">↓</button>
                      <button type="button" onClick={() => toggleClient(id)} className="px-2 text-red-600">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Agregar clientes</h3>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
              {allClients.map((client) => (
                <label
                  key={client.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={orderedIds.includes(client.id)}
                    onChange={() => toggleClient(client.id)}
                  />
                  <span>{client.fullName}</span>
                  <span className="text-xs text-slate-400">{client.code}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showAssign && (
        <AssignCollectorModal
          collectors={activeCollectorsQuery.data ?? []}
          isSubmitting={assignMutation.isPending}
          error={assignMutation.error}
          hasCurrentCollector={Boolean(route.assignedCollector)}
          onClose={() => setShowAssign(false)}
          onSubmit={(values) => assignMutation.mutate(values)}
        />
      )}
    </div>
  );
}

function AssignCollectorModal({
  collectors,
  isSubmitting,
  error,
  hasCurrentCollector,
  onClose,
  onSubmit,
}: {
  collectors: CollectorSummary[];
  isSubmitting: boolean;
  error: Error | null;
  hasCurrentCollector?: boolean;
  onClose: () => void;
  onSubmit: (values: AssignCollectorFormValues) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AssignCollectorFormValues>({
    resolver: zodResolver(assignCollectorSchema),
    defaultValues: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
    },
  });

  return (
    <Modal
      title={hasCurrentCollector ? "Cambiar cobrador" : "Asignar cobrador"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Cobrador</label>
          <select className={inputClass} {...register("collectorId")}>
            <option value="">Seleccionar…</option>
            {collectors.map((c) => (
              <option key={c.userId} value={c.userId}>
                {collectorSelectLabel(c)}
              </option>
            ))}
          </select>
          {errors.collectorId && <p className="mt-1 text-sm text-red-600">{errors.collectorId.message}</p>}
        </div>
        <Input label="Desde" type="date" error={errors.effectiveFrom?.message} {...register("effectiveFrom")} />
        <Input label="Hasta (opcional)" type="date" {...register("effectiveTo")} />
        {error && (
          <Alert variant="error">
            {error instanceof ApiError ? error.message : "Error al asignar"}
          </Alert>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Asignando…" : "Asignar"}
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
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input className={inputClass} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
