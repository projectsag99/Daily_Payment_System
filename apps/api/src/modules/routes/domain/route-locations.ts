import { City, State } from "country-state-city";

export const ROUTE_COUNTRIES = [
  { code: "CO", name: "Colombia" },
  { code: "UY", name: "Uruguay" },
  { code: "AR", name: "Argentina" },
  { code: "EC", name: "Ecuador" },
  { code: "PE", name: "Perú" },
  { code: "MX", name: "México" },
  { code: "CL", name: "Chile" },
  { code: "VE", name: "Venezuela" },
  { code: "PA", name: "Panamá" },
  { code: "CR", name: "Costa Rica" },
  { code: "BO", name: "Bolivia" },
  { code: "PY", name: "Paraguay" },
] as const;

export type RouteCountryCode = (typeof ROUTE_COUNTRIES)[number]["code"];

export const ROUTE_COUNTRY_CODES: RouteCountryCode[] = ROUTE_COUNTRIES.map(
  (country) => country.code,
);

export function isValidRouteCountryCode(value: string): value is RouteCountryCode {
  return (ROUTE_COUNTRY_CODES as readonly string[]).includes(value);
}

export function getRouteStates(countryCode: string) {
  if (!isValidRouteCountryCode(countryCode)) {
    return [];
  }
  return State.getStatesOfCountry(countryCode).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function getRouteCities(countryCode: string, departmentCode: string) {
  if (!isValidRouteCountryCode(countryCode) || !departmentCode) {
    return [];
  }
  return City.getCitiesOfState(countryCode, departmentCode).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function getRouteDepartmentName(
  countryCode: string,
  departmentCode: string,
): string | null {
  if (!departmentCode) return null;
  return (
    State.getStateByCodeAndCountry(departmentCode, countryCode)?.name ??
    departmentCode
  );
}

export function getRouteCountryName(code: string): string | null {
  return ROUTE_COUNTRIES.find((country) => country.code === code)?.name ?? null;
}

export function isValidRouteDepartment(
  countryCode: string,
  departmentCode: string,
): boolean {
  return getRouteStates(countryCode).some(
    (state) => state.isoCode === departmentCode,
  );
}

export function isValidRouteCity(
  countryCode: string,
  departmentCode: string,
  city: string,
): boolean {
  if (!city.trim()) return false;
  const cities = getRouteCities(countryCode, departmentCode);
  if (cities.some((entry) => entry.name === city)) {
    return true;
  }
  // Allow custom city names when not present in the dataset.
  return city.trim().length >= 2;
}

export function formatDepartmentLabel(name: string): string {
  return name
    .replace(/ Department$/i, "")
    .replace(/ Province$/i, "")
    .replace(/ Region$/i, "")
    .trim();
}
