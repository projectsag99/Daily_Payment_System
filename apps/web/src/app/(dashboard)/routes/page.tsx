"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import { fetchAssignableCollectors } from "@/lib/api/collectors";
import { createRoute, fetchRoutes } from "@/lib/api/routes";
import {
  SHIFT_LABELS,
  SHIFT_TYPES,
  ShiftType,
} from "@/lib/constants";
import { RouteLocationFields, RouteLocationFieldsValues } from "@/components/route-location-fields";
import { formatRouteLocation } from "@/lib/constants/route-locations";
import {
  CreateRouteFormValues,
  createRouteSchema,
  toCreateRoutePayload,
} from "@/lib/schemas/auth.schema";
import { collectorSelectLabel } from "@/lib/utils/collector-label";

export default function RoutesPage() {
  const queryClient = useQueryClient();
  const [shift, setShift] = useState<ShiftType | "">("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["routes", shift, activeOnly],
    queryFn: () =>
      fetchRoutes({
        shift: shift || undefined,
        isActive: activeOnly ? true : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateRouteFormValues) =>
      createRoute(toCreateRoutePayload(values)),
    onSuccess: () => {
      setFeedback("Ruta creada correctamente.");
      setShowCreate(false);
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const routes = data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Rutas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configura rutas de cobro y asignación de clientes.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className={btnPrimary}>
          Nueva ruta
        </button>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={shift}
          onChange={(e) => setShift(e.target.value as ShiftType | "")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los turnos</option>
          {SHIFT_TYPES.map((s) => (
            <option key={s} value={s}>
              {SHIFT_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Solo activas
        </label>
      </div>

      {isLoading && <p className="text-sm text-slate-600">Cargando rutas…</p>}

      {error && (
        <Alert variant="error">
          {error instanceof ApiError ? error.message : "Error al cargar rutas"}
        </Alert>
      )}

      {!isLoading && routes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
          No hay rutas registradas.
        </div>
      )}

      {routes.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium">Clientes</th>
                <th className="px-4 py-3 font-medium">Cobrador</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{route.name}</td>
                  <td className="px-4 py-3">
                    {formatRouteLocation(route.country, route.department, route.city)}
                  </td>
                  <td className="px-4 py-3">{route.clientCount}</td>
                  <td className="px-4 py-3">
                    {route.assignedCollector?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {route.isActive ? (
                      <span className="text-green-700">Activa</span>
                    ) : (
                      <span className="text-slate-500">Inactiva</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/routes/${route.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateRouteModal
          isSubmitting={createMutation.isPending}
          error={createMutation.error}
          onClose={() => setShowCreate(false)}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      )}
    </div>
  );
}

function CreateRouteModal({
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (values: CreateRouteFormValues) => void;
}) {
  const collectorsQuery = useQuery({
    queryKey: ["collectors-assignable"],
    queryFn: fetchAssignableCollectors,
  });

  const form = useForm<CreateRouteFormValues>({
    resolver: zodResolver(createRouteSchema),
  });

  const collectors = collectorsQuery.data ?? [];
  const pendingCount = collectors.filter((c) => c.status === "pending").length;

  return (
    <Modal title="Nueva ruta" onClose={onClose}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre *</label>
          <input className={inputClass} {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

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
        />

        <div>
          <label className="mb-1 block text-sm font-medium">Cobrador responsable</label>
          <select
            className={inputClass}
            {...form.register("collectorId")}
            disabled={collectorsQuery.isLoading}
          >
            <option value="">
              {collectorsQuery.isLoading
                ? "Cargando cobradores…"
                : "Sin asignar (puedes hacerlo después)"}
            </option>
            {collectors.map((c) => (
              <option key={c.userId} value={c.userId}>
                {collectorSelectLabel(c)}
              </option>
            ))}
          </select>
          {form.formState.errors.collectorId && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.collectorId.message}
            </p>
          )}
          {collectorsQuery.error && (
            <p className="mt-1 text-sm text-red-600">
              No se pudieron cargar los cobradores. Revisa la conexión con la API.
            </p>
          )}
          {!collectorsQuery.isLoading &&
            !collectorsQuery.error &&
            collectors.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                No hay cobradores registrados. Crea una cuenta de cobrador desde el
                registro o en la sección Cobradores.
              </p>
            )}
          {pendingCount > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              {pendingCount} cobrador(es) pendiente(s) de aprobación. Apruébalos en{" "}
              <Link href="/collectors" className="font-medium underline">
                Cobradores → Pendientes
              </Link>{" "}
              para que puedan operar en la app.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Descripción</label>
          <textarea rows={2} className={inputClass} {...form.register("description")} />
        </div>

        {error && (
          <Alert variant="error">
            {error instanceof ApiError ? error.message : "Error al crear"}
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Creando…" : "Crear ruta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const btnPrimary =
  "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60";
const btnSecondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm";
