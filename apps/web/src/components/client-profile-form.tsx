"use client";

import {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import {
  RouteLocationFields,
  RouteLocationFieldsValues,
} from "@/components/route-location-fields";
import { LocationPicker } from "@/components/location-picker";
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS } from "@/lib/constants";
import { getCountryPhonePrefix } from "@/lib/constants/route-locations";
import { UpdateClientFormValues } from "@/lib/schemas/auth.schema";
import { Client } from "@/lib/types/clients";
import { formatDateTime } from "@/lib/utils/format";

const inlineInputClass =
  "w-full rounded-md border border-transparent bg-slate-50/80 px-2 py-1.5 text-sm text-slate-900 transition hover:bg-slate-50 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100";

interface ClientProfileFormProps {
  client: Client;
  register: UseFormRegister<UpdateClientFormValues>;
  watch: UseFormWatch<UpdateClientFormValues>;
  setValue: UseFormSetValue<UpdateClientFormValues>;
  errors: FieldErrors<UpdateClientFormValues>;
  onSubmit: () => void;
  isDirty: boolean;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function ClientProfileForm({
  client,
  register,
  watch,
  setValue,
  errors,
  onSubmit,
  isDirty,
  isSubmitting,
  submitError,
}: ClientProfileFormProps) {
  const selectedCountry = watch("country");
  const selectedDepartment = watch("department");
  const selectedCity = watch("city");
  const selectedCityCustom = watch("cityCustom");
  const lat = watch("lat");
  const lng = watch("lng");
  const phonePrefix = selectedCountry
    ? getCountryPhonePrefix(selectedCountry)
    : "";

  const mapLocation =
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
      ? { lat, lng }
      : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Información del cliente</h2>
          <p className="mt-1 text-xs text-slate-500">
            Haz clic en cualquier campo para modificarlo y guarda los cambios.
          </p>
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </button>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código">
            <input
              className={`${inlineInputClass} font-mono text-slate-500`}
              value={client.code}
              readOnly
              disabled
            />
          </Field>

          <Field label="Estado" error={errors.status?.message}>
            <select className={inlineInputClass} {...register("status")}>
              {CLIENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CLIENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nombre" error={errors.firstName?.message}>
            <input className={inlineInputClass} {...register("firstName")} />
          </Field>

          <Field label="Apellido" error={errors.lastName?.message}>
            <input className={inlineInputClass} {...register("lastName")} />
          </Field>

          <Field label="Cédula" error={errors.nationalId?.message}>
            <input className={inlineInputClass} {...register("nationalId")} />
          </Field>

          <Field label="Teléfono" error={errors.phoneLocal?.message}>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-100 px-2 text-sm text-slate-600">
                {phonePrefix ? `+${phonePrefix}` : "—"}
              </span>
              <input
                className={`${inlineInputClass} rounded-l-none`}
                placeholder={selectedCountry ? "3001234567" : "Selecciona un país"}
                disabled={!selectedCountry}
                {...register("phoneLocal")}
              />
            </div>
          </Field>

          <Field label="Correo" error={errors.email?.message}>
            <input
              className={inlineInputClass}
              type="email"
              {...register("email")}
            />
          </Field>

          <Field label="Registrado">
            <input
              className={`${inlineInputClass} text-slate-500`}
              value={formatDateTime(client.createdAt)}
              readOnly
              disabled
            />
          </Field>

          <Field label="Dirección" className="sm:col-span-2" error={errors.addressLine?.message}>
            <input className={inlineInputClass} {...register("addressLine")} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            País, departamento y ciudad
          </p>
          <RouteLocationFields
            register={
              register as unknown as UseFormRegister<RouteLocationFieldsValues>
            }
            watch={watch as unknown as UseFormWatch<RouteLocationFieldsValues>}
            setValue={
              setValue as unknown as UseFormSetValue<RouteLocationFieldsValues>
            }
            errors={errors as FieldErrors<RouteLocationFieldsValues>}
            inputClass={inlineInputClass}
            requireAll={false}
          />
        </div>

        <LocationPicker
          countryCode={selectedCountry}
          departmentCode={selectedDepartment}
          city={selectedCity}
          cityCustom={selectedCityCustom}
          value={mapLocation}
          onChange={(location) => {
            if (location) {
              setValue("lat", location.lat, { shouldDirty: true });
              setValue("lng", location.lng, { shouldDirty: true });
            } else {
              setValue("lat", undefined, { shouldDirty: true });
              setValue("lng", undefined, { shouldDirty: true });
            }
          }}
        />

        <Field label="Notas" error={errors.notes?.message}>
          <textarea
            rows={3}
            className={inlineInputClass}
            {...register("notes")}
          />
        </Field>

        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}

        {isDirty && (
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}
      </form>
    </section>
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
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
