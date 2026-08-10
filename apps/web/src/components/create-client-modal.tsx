"use client";

import { useMemo, useState } from "react";
import {
  useForm,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import {
  RouteLocationFields,
  RouteLocationFieldsValues,
} from "@/components/route-location-fields";
import { LocationPicker } from "@/components/location-picker";
import { ApiError } from "@/lib/api-client";
import { getCountryPhonePrefix } from "@/lib/constants/route-locations";
import { getCurrencyForCountry, getCurrencyLabel } from "@/lib/constants/currencies";
import {
  computeCreditTerms,
  creditTermsToCreatePayload,
} from "@/lib/domain/credit-calculator";
import {
  CREATE_CLIENT_CREDIT_DEFAULTS,
  CREATE_CLIENT_INSTALLMENT_PRESETS,
  CreateClientWithCreditFormValues,
  createClientWithCreditSchema,
  toCreateClientPayload,
} from "@/lib/schemas/auth.schema";
import { createCredit } from "@/lib/api/credits";
import { createClient } from "@/lib/api/clients";
import { formatMoney } from "@/lib/utils/format";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/ui-classes";

const PERSONAL_FIELDS = [
  "firstName",
  "lastName",
  "nationalId",
  "phoneLocal",
  "email",
  "country",
  "department",
  "city",
  "cityCustom",
  "addressLine",
  "lat",
  "lng",
  "notes",
] as const;

type CreateClientTab = "personal" | "credit";

export function CreateClientModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (client: { id: string; code: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<CreateClientTab>("personal");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateClientWithCreditFormValues>({
    resolver: zodResolver(createClientWithCreditSchema),
    defaultValues: {
      creditInterestPercent: CREATE_CLIENT_CREDIT_DEFAULTS.creditInterestPercent,
      creditInstallments: CREATE_CLIENT_CREDIT_DEFAULTS.creditInstallments,
    },
  });

  const selectedCountry = form.watch("country");
  const selectedDepartment = form.watch("department");
  const selectedCity = form.watch("city");
  const selectedCityCustom = form.watch("cityCustom");
  const lat = form.watch("lat");
  const lng = form.watch("lng");
  const creditAmount = form.watch("creditAmount");
  const creditInterestPercent = form.watch("creditInterestPercent");
  const creditInstallments = form.watch("creditInstallments");

  const phonePrefix = selectedCountry
    ? getCountryPhonePrefix(selectedCountry)
    : "";
  const currency =
    (selectedCountry && getCurrencyForCountry(selectedCountry)) ?? "COP";

  const mapLocation =
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
      ? { lat, lng }
      : null;

  const creditPreview = useMemo(() => {
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

  async function goToCreditTab() {
    const valid = await form.trigger([...PERSONAL_FIELDS]);
    if (valid) {
      setActiveTab("credit");
    }
  }

  async function handleSubmit(values: CreateClientWithCreditFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const client = await createClient(toCreateClientPayload(values));
      const terms = computeCreditTerms({
        amount: values.creditAmount,
        interestPercent: values.creditInterestPercent,
        totalInstallments: values.creditInstallments,
        currency,
      });
      await createCredit(
        client.id,
        creditTermsToCreatePayload(
          terms,
          new Date().toISOString().slice(0, 10),
        ),
      );
      onSuccess(client);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "No se pudo completar el registro del cliente",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayError = submitError;

  return (
    <Modal title="Nuevo cliente" onClose={onClose} wide>
      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <TabButton
          active={activeTab === "personal"}
          onClick={() => setActiveTab("personal")}
        >
          Datos personales
        </TabButton>
        <TabButton
          active={activeTab === "credit"}
          onClick={() => void goToCreditTab()}
        >
          Crédito
        </TabButton>
      </div>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {activeTab === "personal" ? (
          <>
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Información personal
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre *"
                  error={form.formState.errors.firstName?.message}
                >
                  <input className={inputClass} {...form.register("firstName")} />
                </Field>
                <Field
                  label="Apellido *"
                  error={form.formState.errors.lastName?.message}
                >
                  <input className={inputClass} {...form.register("lastName")} />
                </Field>
                <Field
                  label="Cédula"
                  error={form.formState.errors.nationalId?.message}
                >
                  <input className={inputClass} {...form.register("nationalId")} />
                </Field>
                <Field label="Código del cliente">
                  <input
                    className={`${inputClass} bg-slate-50 text-slate-500`}
                    value="Se genera automáticamente al guardar"
                    readOnly
                    disabled
                  />
                </Field>
                <Field
                  label="Teléfono"
                  error={form.formState.errors.phoneLocal?.message}
                >
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                      {phonePrefix ? `+${phonePrefix}` : "—"}
                    </span>
                    <input
                      className={`${inputClass} rounded-l-none`}
                      placeholder={
                        selectedCountry
                          ? "3001234567"
                          : "Selecciona un país primero"
                      }
                      disabled={!selectedCountry}
                      {...form.register("phoneLocal")}
                    />
                  </div>
                </Field>
                <Field label="Correo" error={form.formState.errors.email?.message}>
                  <input
                    className={inputClass}
                    type="email"
                    {...form.register("email")}
                  />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Ubicación
              </h3>
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
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Dirección y notas
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dirección" className="sm:col-span-2">
                  <input className={inputClass} {...form.register("addressLine")} />
                </Field>
                <LocationPicker
                  className="sm:col-span-2"
                  countryCode={selectedCountry}
                  departmentCode={selectedDepartment}
                  city={selectedCity}
                  cityCustom={selectedCityCustom}
                  value={mapLocation}
                  onChange={(location) => {
                    if (location) {
                      form.setValue("lat", location.lat, { shouldDirty: true });
                      form.setValue("lng", location.lng, { shouldDirty: true });
                    } else {
                      form.setValue("lat", undefined, { shouldDirty: true });
                      form.setValue("lng", undefined, { shouldDirty: true });
                    }
                  }}
                />
                <Field label="Notas" className="sm:col-span-2">
                  <textarea
                    rows={2}
                    className={inputClass}
                    {...form.register("notes")}
                  />
                </Field>
              </div>
            </section>
          </>
        ) : (
          <>
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Condiciones del crédito
              </h3>
              <p className="mb-4 text-sm text-slate-600">
                Moneda según el país del cliente:{" "}
                <span className="font-medium">{getCurrencyLabel(currency)}</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={`Monto (${currency}) *`}
                  error={form.formState.errors.creditAmount?.message}
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={inputClass}
                    placeholder="Ej. 500000"
                    {...form.register("creditAmount")}
                  />
                </Field>
                <Field
                  label="Porcentaje de interés (%) *"
                  error={form.formState.errors.creditInterestPercent?.message}
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className={inputClass}
                    {...form.register("creditInterestPercent")}
                  />
                </Field>
                <Field
                  label="Número de cuotas *"
                  className="sm:col-span-2"
                  error={form.formState.errors.creditInstallments?.message}
                >
                  <div className="flex flex-wrap gap-2">
                    {CREATE_CLIENT_INSTALLMENT_PRESETS.map((preset) => {
                      const selected = Number(creditInstallments) === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            form.setValue("creditInstallments", preset, {
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
                    {...form.register("creditInstallments")}
                  />
                </Field>
              </div>
            </section>

            <CreditSummary preview={creditPreview} currency={currency} />
          </>
        )}

        {displayError && <Alert variant="error">{displayError}</Alert>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          {activeTab === "personal" ? (
            <button
              type="button"
              onClick={() => void goToCreditTab()}
              className={btnPrimary}
            >
              Siguiente: Crédito
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={btnSecondary}
              >
                Anterior
              </button>
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>
                {isSubmitting ? "Guardando…" : "Crear cliente y crédito"}
              </button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

function CreditSummary({
  preview,
  currency,
}: {
  preview: ReturnType<typeof computeCreditTerms> | null;
  currency: string;
}) {
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

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">
        Resumen del crédito
      </h3>
      <dl className="grid gap-3 sm:grid-cols-2">
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-white text-brand-700 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
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
