"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api-client";
import { createPayment } from "@/lib/api/payments";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from "@/lib/constants";
import { RouteClient } from "@/lib/types/routes";
import { CreatePaymentResponse } from "@/lib/types/payments";
import { formatMoney } from "@/lib/utils/format";

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().max(1000).optional(),
});

type RecordPaymentFormValues = z.infer<typeof recordPaymentSchema>;

export function RecordPaymentModal({
  client,
  onClose,
  onSuccess,
}: {
  client: RouteClient;
  onClose: () => void;
  onSuccess: (result: CreatePaymentResponse) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: client.amountDue > 0 ? client.amountDue : undefined,
      paymentMethod: "cash",
      notes: "",
    },
  });

  useEffect(() => {
    reset({
      amount: client.amountDue > 0 ? client.amountDue : undefined,
      paymentMethod: "cash",
      notes: "",
    });
  }, [client, reset]);

  const mutation = useMutation({
    mutationFn: (values: RecordPaymentFormValues) =>
      createPayment({
        clientId: client.id,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        capturedAt: new Date().toISOString(),
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: (result) => {
      onSuccess(result);
    },
  });

  return (
    <Modal title={`Registrar pago — ${client.fullName}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        Código {client.code} · Sugerido {formatMoney(client.amountDue)}
      </p>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="amount"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Monto
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="paymentMethod"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Método de pago
          </label>
          <select
            id="paymentMethod"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            {...register("paymentMethod")}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method as PaymentMethod]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Notas (opcional)
          </label>
          <textarea
            id="notes"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            {...register("notes")}
          />
        </div>

        {mutation.error && (
          <Alert variant="error">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : "No se pudo registrar el pago"}
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mutation.isPending ? "Registrando…" : "Registrar pago"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
