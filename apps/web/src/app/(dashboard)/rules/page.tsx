"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import {
  createRule,
  deleteRule,
  evaluateRule,
  fetchRules,
  updateRule,
} from "@/lib/api/rules";
import {
  NOTIFY_CHANNELS,
  NOTIFY_CHANNEL_LABELS,
  RULE_TYPES,
  RULE_TYPE_LABELS,
  RuleType,
} from "@/lib/constants";
import {
  CreateRuleFormValues,
  UpdateRuleFormValues,
  createRuleSchema,
  updateRuleSchema,
} from "@/lib/schemas/auth.schema";
import { BusinessRule } from "@/lib/types/rules";

export default function RulesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rules"],
    queryFn: fetchRules,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => {
      setFeedback("Regla eliminada.");
      void queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: (id: string) => evaluateRule(id),
    onSuccess: (result) => {
      setFeedback(
        `Evaluación: ${result.matchedClients} clientes coincidieron, ${result.notificationsCreated} notificaciones creadas.`,
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateRule(id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["rules"] }),
  });

  const rules = data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Reglas de negocio
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configura alertas automáticas para cobradores y administradores.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className={btnPrimary}>
          Nueva regla
        </button>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      {evaluateMutation.error && (
        <Alert variant="error">
          {evaluateMutation.error instanceof ApiError
            ? evaluateMutation.error.message
            : "Error al evaluar"}
        </Alert>
      )}

      {isLoading && <p className="text-sm text-slate-600">Cargando reglas…</p>}

      {error && (
        <Alert variant="error">
          {error instanceof ApiError ? error.message : "Error al cargar reglas"}
        </Alert>
      )}

      {!isLoading && rules.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
          No hay reglas configuradas.
        </div>
      )}

      {rules.length > 0 && (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{rule.name}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        rule.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {rule.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {RULE_TYPE_LABELS[rule.ruleType]}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Canal: {NOTIFY_CHANNEL_LABELS[rule.notifyChannel]} · Cooldown:{" "}
                    {rule.cooldownHours}h · {formatConfig(rule)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })
                    }
                    className={btnSecondary}
                  >
                    {rule.isActive ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(rule)}
                    className={btnSecondary}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => evaluateMutation.mutate(rule.id)}
                    disabled={evaluateMutation.isPending}
                    className={btnSecondary}
                  >
                    Evaluar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Eliminar esta regla?")) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <RuleFormModal
          title="Nueva regla"
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setFeedback("Regla creada.");
            void queryClient.invalidateQueries({ queryKey: ["rules"] });
          }}
          onSubmit={createRule}
        />
      )}

      {editing && (
        <RuleFormModal
          title="Editar regla"
          initial={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            setFeedback("Regla actualizada.");
            void queryClient.invalidateQueries({ queryKey: ["rules"] });
          }}
          onSubmit={(values) =>
            updateRule(editing.id, {
              ...values,
              ruleType: editing.ruleType,
            })
          }
        />
      )}
    </div>
  );
}

function formatConfig(rule: BusinessRule): string {
  const cfg = rule.config;
  if (rule.ruleType === "overdue_installments_threshold") {
    const count = cfg.thresholdCount ?? cfg.threshold_count;
    return `Umbral: ${String(count)} cuotas vencidas`;
  }
  const amount = cfg.thresholdAmount ?? cfg.threshold_amount;
  return `Umbral: $${Number(amount).toLocaleString("es-CO")}`;
}

function RuleFormModal({
  title,
  initial,
  onClose,
  onSuccess,
  onSubmit,
}: {
  title: string;
  initial?: BusinessRule;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (values: CreateRuleFormValues) => Promise<BusinessRule>;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  const defaultRuleType = initial?.ruleType ?? "overdue_installments_threshold";
  const config = initial?.config ?? {};

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateRuleFormValues>({
    resolver: zodResolver(isEdit ? updateRuleSchema : createRuleSchema),
    defaultValues: {
      name: initial?.name ?? "",
      ruleType: defaultRuleType,
      thresholdCount: Number(config.thresholdCount ?? config.threshold_count ?? 3),
      thresholdAmount: Number(config.thresholdAmount ?? config.threshold_amount ?? 1000),
      notifyChannel: initial?.notifyChannel ?? "push",
      cooldownHours: initial?.cooldownHours ?? 24,
      isActive: initial?.isActive ?? true,
    },
  });

  const ruleType = watch("ruleType") as RuleType;

  async function submit(values: CreateRuleFormValues) {
    setSubmitError(null);
    try {
      await onSubmit(values);
      onSuccess();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Error al guardar la regla",
      );
    }
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Nombre *</label>
          <input className={inputClass} {...register("name")} />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        {!isEdit && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Tipo *</label>
            <select className={inputClass} {...register("ruleType")}>
              {RULE_TYPES.map((t) => (
                <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        )}

        {ruleType === "overdue_installments_threshold" ? (
          <div>
            <label className="mb-1 block text-sm font-medium">Cuotas vencidas (umbral)</label>
            <input type="number" className={inputClass} {...register("thresholdCount")} />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium">Monto acumulado (umbral)</label>
            <input type="number" step="0.01" className={inputClass} {...register("thresholdAmount")} />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Canal</label>
          <select className={inputClass} {...register("notifyChannel")}>
            {NOTIFY_CHANNELS.map((c) => (
              <option key={c} value={c}>{NOTIFY_CHANNEL_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Cooldown (horas)</label>
          <input type="number" className={inputClass} {...register("cooldownHours")} />
        </div>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" {...register("isActive")} />
          Regla activa
        </label>

        {submitError && (
          <div className="sm:col-span-2">
            <Alert variant="error">{submitError}</Alert>
          </div>
        )}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const btnPrimary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60";
const btnSecondary = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50";
