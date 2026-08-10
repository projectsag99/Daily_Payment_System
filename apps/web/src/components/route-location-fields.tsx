"use client";

import { useMemo } from "react";
import {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import {
  OTHER_ROUTE_CITY_VALUE,
  ROUTE_COUNTRIES,
  formatDepartmentLabel,
  getRouteCities,
  getRouteStates,
} from "@/lib/constants/route-locations";
import {
  CreateRouteFormValues,
} from "@/lib/schemas/auth.schema";

export type RouteLocationFieldsValues = {
  country?: CreateRouteFormValues["country"] | "";
  department?: string;
  city?: string;
  cityCustom?: string;
};

interface RouteLocationFieldsProps {
  register: UseFormRegister<RouteLocationFieldsValues>;
  watch: UseFormWatch<RouteLocationFieldsValues>;
  setValue: UseFormSetValue<RouteLocationFieldsValues>;
  errors: FieldErrors<RouteLocationFieldsValues>;
  inputClass: string;
  requireAll?: boolean;
}

export function useRouteLocationOptions(
  countryCode: string | undefined,
  departmentCode: string | undefined,
) {
  const departments = useMemo(
    () => (countryCode ? getRouteStates(countryCode) : []),
    [countryCode],
  );

  const cities = useMemo(
    () =>
      countryCode && departmentCode
        ? getRouteCities(countryCode, departmentCode)
        : [],
    [countryCode, departmentCode],
  );

  return { departments, cities };
}

export function RouteLocationFields({
  register,
  watch,
  setValue,
  errors,
  inputClass,
  requireAll = true,
}: RouteLocationFieldsProps) {
  const selectedCountry = watch("country");
  const selectedDepartment = watch("department");
  const selectedCity = watch("city");
  const { departments, cities } = useRouteLocationOptions(
    selectedCountry,
    selectedDepartment,
  );

  const showCustomCity = selectedCity === OTHER_ROUTE_CITY_VALUE;
  const requiredMark = requireAll ? " *" : "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            País{requiredMark}
          </label>
          <select
            className={inputClass}
            defaultValue=""
            {...register("country", {
              onChange: () => {
                setValue("department", "");
                setValue("city", "");
                setValue("cityCustom", "");
              },
            })}
          >
            <option value="" disabled>
              Seleccionar país…
            </option>
            {ROUTE_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Departamento / Estado{requiredMark}
          </label>
          <select
            className={inputClass}
            defaultValue=""
            {...register("department", {
              onChange: () => {
                setValue("city", "");
                setValue("cityCustom", "");
              },
            })}
            disabled={!selectedCountry}
          >
            <option value="" disabled>
              {selectedCountry
                ? "Seleccionar departamento…"
                : "Primero elige un país"}
            </option>
            {departments.map((department) => (
              <option key={department.isoCode} value={department.isoCode}>
                {formatDepartmentLabel(department.name)}
              </option>
            ))}
          </select>
          {errors.department && (
            <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Ciudad{requiredMark}
          </label>
          <select
            className={inputClass}
            defaultValue=""
            {...register("city", {
              onChange: (event) => {
                if (event.target.value !== OTHER_ROUTE_CITY_VALUE) {
                  setValue("cityCustom", "");
                }
              },
            })}
            disabled={!selectedDepartment}
          >
            <option value="" disabled>
              {selectedDepartment
                ? `Seleccionar ciudad (${cities.length} disponibles)…`
                : "Primero elige un departamento"}
            </option>
            {cities.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name}
              </option>
            ))}
            <option value={OTHER_ROUTE_CITY_VALUE}>Otra (escribir manualmente)</option>
          </select>
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>
        {showCustomCity && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nombre de la ciudad{requiredMark}
            </label>
            <input
              className={inputClass}
              placeholder="Escribe el nombre de la ciudad"
              {...register("cityCustom")}
            />
            {errors.cityCustom && (
              <p className="mt-1 text-sm text-red-600">{errors.cityCustom.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
