"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api-client";
import {
  fetchClientRoutes,
  replaceClientRoutes,
} from "@/lib/api/clients";
import { fetchRoutes } from "@/lib/api/routes";
import { formatRouteLocation } from "@/lib/constants/route-locations";
import { ClientRoute } from "@/lib/types/clients";

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const btnPrimary =
  "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60";
const btnSecondary =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60";

export function ClientRoutesSection({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routesQuery = useQuery({
    queryKey: ["client-routes", clientId],
    queryFn: () => fetchClientRoutes(clientId),
  });

  const allRoutesQuery = useQuery({
    queryKey: ["routes-active"],
    queryFn: () => fetchRoutes({ isActive: true }),
  });

  const mutation = useMutation({
    mutationFn: (routeIds: string[]) => replaceClientRoutes(clientId, routeIds),
    onSuccess: () => {
      setFeedback("Rutas actualizadas.");
      setError(null);
      setSelectedRouteId("");
      void queryClient.invalidateQueries({ queryKey: ["client-routes", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
      void queryClient.invalidateQueries({ queryKey: ["route-clients"] });
    },
    onError: (err) => {
      setFeedback(null);
      setError(
        err instanceof ApiError ? err.message : "No se pudieron actualizar las rutas",
      );
    },
  });

  const assignedRoutes = routesQuery.data ?? [];
  const assignedIds = new Set(assignedRoutes.map((route) => route.id));
  const availableRoutes = (allRoutesQuery.data ?? []).filter(
    (route) => !assignedIds.has(route.id),
  );

  function updateRoutes(nextRouteIds: string[]) {
    setFeedback(null);
    mutation.mutate(nextRouteIds);
  }

  function handleAddRoute() {
    if (!selectedRouteId) return;
    updateRoutes([...assignedRoutes.map((route) => route.id), selectedRouteId]);
  }

  function handleRemoveRoute(routeId: string) {
    updateRoutes(assignedRoutes.filter((route) => route.id !== routeId).map((r) => r.id));
  }

  function handleChangeRoute(routeId: string) {
    updateRoutes([routeId]);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-900">Rutas asignadas</h2>
      <p className="mb-4 text-sm text-slate-600">
        Agrega, quita o cambia las rutas donde se visita a este cliente.
      </p>

      {feedback && <Alert variant="success">{feedback}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {routesQuery.isLoading ? (
        <p className="text-sm text-slate-600">Cargando rutas…</p>
      ) : assignedRoutes.length === 0 ? (
        <p className="mb-4 text-sm text-slate-600">
          Este cliente no está asignado a ninguna ruta.
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {assignedRoutes.map((route) => (
            <AssignedRouteItem
              key={route.id}
              route={route}
              isSubmitting={mutation.isPending}
              onRemove={() => handleRemoveRoute(route.id)}
            />
          ))}
        </ul>
      )}

      <div className="space-y-4 border-t border-slate-100 pt-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {assignedRoutes.length === 0 ? "Asignar a ruta" : "Agregar otra ruta"}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className={inputClass}
              value={selectedRouteId}
              onChange={(event) => setSelectedRouteId(event.target.value)}
              disabled={allRoutesQuery.isLoading || mutation.isPending}
            >
              <option value="">
                {allRoutesQuery.isLoading
                  ? "Cargando rutas…"
                  : availableRoutes.length === 0
                    ? "No hay más rutas disponibles"
                    : "Selecciona una ruta"}
              </option>
              {availableRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                  {" · "}
                  {formatRouteLocation(route.country, route.department, route.city)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddRoute}
              disabled={
                !selectedRouteId || mutation.isPending || availableRoutes.length === 0
              }
              className={btnPrimary}
            >
              {mutation.isPending ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>

        {assignedRoutes.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cambiar a una sola ruta
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className={inputClass}
                defaultValue=""
                disabled={allRoutesQuery.isLoading || mutation.isPending}
                onChange={(event) => {
                  if (event.target.value) {
                    handleChangeRoute(event.target.value);
                    event.target.value = "";
                  }
                }}
              >
                <option value="">Selecciona la nueva ruta</option>
                {(allRoutesQuery.data ?? []).map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                    {" · "}
                    {formatRouteLocation(route.country, route.department, route.city)}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Reemplaza todas las rutas actuales por la seleccionada.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function AssignedRouteItem({
  route,
  isSubmitting,
  onRemove,
}: {
  route: ClientRoute;
  isSubmitting: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div>
        <Link
          href={`/routes/${route.id}`}
          className="font-medium text-brand-700 hover:underline"
        >
          {route.name}
        </Link>
        <p className="text-xs text-slate-500">
          {formatRouteLocation(route.country, route.department, route.city)}
          {" · Orden "}
          {route.sequenceOrder}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={isSubmitting}
        className={btnSecondary}
      >
        Quitar
      </button>
    </li>
  );
}
