"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import { createRoute, fetchRoutes } from "@/lib/api/routes";
import {
  DAY_LABELS,
  SHIFT_LABELS,
  SHIFT_TYPES,
  ShiftType,
} from "@/lib/constants";
import {
  CreateRouteFormValues,
  createRouteSchema,
} from "@/lib/schemas/auth.schema";

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
    mutationFn: createRoute,
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
                <th className="px-4 py-3 font-medium">Turno</th>
                <th className="px-4 py-3 font-medium">Día</th>
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
                  <td className="px-4 py-3">{SHIFT_LABELS[route.shift]}</td>
                  <td className="px-4 py-3">
                    {route.dayOfWeek !== null
                      ? DAY_LABELS[route.dayOfWeek]
                      : "Todos"}
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
  const { register, handleSubmit, formState: { errors } } = useForm<CreateRouteFormValues>({
    resolver: zodResolver(createRouteSchema),
    defaultValues: { shift: "morning" },
  });

  return (
    <Modal title="Nueva ruta" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre *</label>
          <input className={inputClass} {...register("name")} />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Turno *</label>
          <select className={inputClass} {...register("shift")}>
            {SHIFT_TYPES.map((s) => (
              <option key={s} value={s}>{SHIFT_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Día (opcional)</label>
          <select className={inputClass} {...register("dayOfWeek")}>
            <option value="">Todos los días</option>
            {DAY_LABELS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Descripción</label>
          <textarea rows={2} className={inputClass} {...register("description")} />
        </div>
        {error && (
          <Alert variant="error">
            {error instanceof ApiError ? error.message : "Error al crear"}
          </Alert>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Creando…" : "Crear ruta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const btnPrimary = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60";
const btnSecondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm";
