"use client";

import { useMemo } from "react";
import {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { getCurrencyLabel } from "@/lib/constants/currencies";
import { computeCreditTerms } from "@/lib/domain/credit-calculator";
import {
  CREATE_CREDIT_INSTALLMENT_PRESETS,
  CreditTermsFormValues,
} from "@/lib/schemas/auth.schema";
import { formatMoney } from "@/lib/utils/format";
import { inputClass } from "@/lib/ui-classes";

interface CreditFormFieldsProps {
  register: UseFormRegister<CreditTermsFormValues>;
  watch: UseFormWatch<CreditTermsFormValues>;
  setValue: UseFormSetValue<CreditTermsFormValues>;
  errors: FieldErrors<CreditTermsFormValues>;
  currency: string;
  currencyHint?: string;
  showNotes?: boolean;
  routeSelector?: React.ReactNode;
}

export function CreditFormFields({
  register,
  watch,
  setValue,
  errors,
  currency,
  currencyHint,
  showNotes = true,
  routeSelector,
}: CreditFormFieldsProps) {
  const creditInstallments = watch("creditInstallments");

  return (
    <>
      {routeSelector}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Condiciones del crédito
        </h3>
        <p className="mb-4 text-sm text-slate-600">
          {currencyHint ?? "Moneda del crédito"}:{" "}
          <span className="font-medium">{getCurrencyLabel(currency)}</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={`Monto (${currency}) *`}
            error={errors.creditAmount?.message}
          >
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputClass}
              placeholder="Ej. 500000"
              {...register("creditAmount")}
            />
          </Field>
          <Field
            label="Porcentaje de interés (%) *"
            error={errors.creditInterestPercent?.message}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className={inputClass}
              {...register("creditInterestPercent")}
            />
          </Field>
          <Field
            label="Fecha del crédito *"
            error={errors.creditStartDate?.message}
          >
            <input
              type="date"
              className={inputClass}
              {...register("creditStartDate")}
            />
          </Field>
          <Field
            label="Número de cuotas *"
            className="sm:col-span-2"
            error={errors.creditInstallments?.message}
          >
            <div className="flex flex-wrap gap-2">
              {CREATE_CREDIT_INSTALLMENT_PRESETS.map((preset) => {
                const selected = Number(creditInstallments) === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setValue("creditInstallments", preset, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {preset} cuotas
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min="1"
              max="3650"
              className={`${inputClass} mt-3`}
              placeholder="Otro número de cuotas"
              {...register("creditInstallments")}
            />
          </Field>
          {showNotes && (
            <Field label="Notas" className="sm:col-span-2">
              <textarea
                rows={2}
                className={inputClass}
                {...register("notes")}
              />
            </Field>
          )}
        </div>
      </section>
    </>
  );
}

export function CreditSummaryPanel({
  creditAmount,
  creditInterestPercent,
  creditInstallments,
  creditStartDate,
  currency,
}: {
  creditAmount: unknown;
  creditInterestPercent: unknown;
  creditInstallments: unknown;
  creditStartDate?: unknown;
  currency: string;
}) {
  const preview = useMemo(() => {
    const amount = Number(creditAmount);
    const interest = Number(creditInterestPercent);
    const installments = Number(creditInstallments);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(installments) ||
      installments < 1
    ) {
      return null;
    }

    return computeCreditTerms({
      amount,
      interestPercent: Number.isFinite(interest) ? interest : 0,
      totalInstallments: installments,
      currency,
    });
  }, [creditAmount, creditInterestPercent, creditInstallments, currency]);

  if (!preview) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          Resumen del crédito
        </h3>
        <p className="text-sm text-slate-600">
          Completa el monto y las cuotas para ver el cálculo automático.
        </p>
      </section>
    );
  }

  const estimatedTotal = preview.installmentAmount * preview.totalInstallments;
  const startDateLabel =
    typeof creditStartDate === "string" && creditStartDate.length > 0
      ? creditStartDate
      : "—";

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">
        Resumen del crédito
      </h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        <SummaryItem
          label="Fecha del crédito"
          value={startDateLabel}
        />
        <SummaryItem
          label="Monto prestado"
          value={formatMoney(preview.principalAmount, currency)}
        />
        <SummaryItem
          label={`Interés (${preview.interestRate}%)`}
          value={formatMoney(preview.interestAmount, currency)}
        />
        <SummaryItem
          label="Total a pagar"
          value={formatMoney(preview.totalToPay, currency)}
        />
        <SummaryItem
          label="Número de cuotas"
          value={String(preview.totalInstallments)}
        />
        <SummaryItem
          label="Valor por cuota"
          value={formatMoney(preview.installmentAmount, currency)}
          highlight
        />
        <SummaryItem
          label="Total estimado (cuotas × valor)"
          value={formatMoney(estimatedTotal, currency)}
        />
      </dl>
    </section>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/80 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd
        className={`mt-0.5 text-sm font-semibold ${
          highlight ? "text-brand-700" : "text-slate-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
