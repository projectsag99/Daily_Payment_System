"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/lib/api-client";
import {
  approveCollector,
  fetchPendingCollectors,
  rejectCollector,
} from "@/lib/api/collectors";
import {
  ApproveCollectorFormValues,
  RejectCollectorFormValues,
  approveCollectorSchema,
  rejectCollectorSchema,
} from "@/lib/schemas/auth.schema";
import { CollectorSummary } from "@/lib/types/collectors";

export default function CollectorsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<CollectorSummary | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["collectors", "pending"],
    queryFn: fetchPendingCollectors,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["collectors", "pending"] });

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: ApproveCollectorFormValues;
    }) => approveCollector(id, values),
    onSuccess: () => {
      setFeedback("Cobrador aprobado correctamente.");
      setSelected(null);
      setAction(null);
      void invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: RejectCollectorFormValues;
    }) => rejectCollector(id, values),
    onSuccess: () => {
      setFeedback("Solicitud rechazada.");
      setSelected(null);
      setAction(null);
      void invalidate();
    },
  });

  const pending = data ?? [];
  const isBusy = approveMutation.isPending || rejectMutation.isPending;
  const mutationError =
    approveMutation.error ?? rejectMutation.error ?? null;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Aprobación de cobradores
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Revisa y aprueba las solicitudes de registro pendientes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Actualizar
        </button>
      </div>

      {feedback && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          {feedback}
        </div>
      )}

      {mutationError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {mutationError instanceof ApiError
            ? mutationError.message
            : "Ocurrió un error al procesar la solicitud"}
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-slate-600">Cargando solicitudes…</p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof ApiError
            ? error.message
            : "No se pudieron cargar los cobradores"}
        </div>
      )}

      {!isLoading && !error && pending.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-slate-600">No hay solicitudes pendientes.</p>
        </div>
      )}

      {!isLoading && pending.length > 0 && (
        <ul className="space-y-3">
          {pending.map((collector) => (
            <li
              key={collector.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {collector.firstName} {collector.lastName}
                  </p>
                  <p className="text-sm text-slate-600">{collector.email}</p>
                  {collector.phone && (
                    <p className="text-sm text-slate-500">{collector.phone}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Registrado:{" "}
                    {new Date(collector.createdAt).toLocaleString("es-CO", {
                      timeZone: "America/Bogota",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setSelected(collector);
                      setAction("approve");
                      setFeedback(null);
                    }}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setSelected(collector);
                      setAction("reject");
                      setFeedback(null);
                    }}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && action === "approve" && (
        <ApproveModal
          collector={selected}
          isSubmitting={approveMutation.isPending}
          onClose={() => {
            setSelected(null);
            setAction(null);
          }}
          onSubmit={(values) =>
            approveMutation.mutate({ id: selected.id, values })
          }
        />
      )}

      {selected && action === "reject" && (
        <RejectModal
          collector={selected}
          isSubmitting={rejectMutation.isPending}
          onClose={() => {
            setSelected(null);
            setAction(null);
          }}
          onSubmit={(values) =>
            rejectMutation.mutate({ id: selected.id, values })
          }
        />
      )}
    </div>
  );
}

function ModalOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ApproveModal({
  collector,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  collector: CollectorSummary;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ApproveCollectorFormValues) => void;
}) {
  const { register, handleSubmit } = useForm<ApproveCollectorFormValues>({
    resolver: zodResolver(approveCollectorSchema),
    defaultValues: { employeeCode: "", notes: "" },
  });

  return (
    <ModalOverlay
      title={`Aprobar a ${collector.firstName} ${collector.lastName}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Código de empleado (opcional)
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            {...register("employeeCode")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notas (opcional)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            {...register("notes")}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Aprobando…" : "Confirmar aprobación"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function RejectModal({
  collector,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  collector: CollectorSummary;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: RejectCollectorFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectCollectorFormValues>({
    resolver: zodResolver(rejectCollectorSchema),
  });

  return (
    <ModalOverlay
      title={`Rechazar a ${collector.firstName} ${collector.lastName}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Motivo del rechazo
          </label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            {...register("reason")}
          />
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Rechazando…" : "Confirmar rechazo"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
