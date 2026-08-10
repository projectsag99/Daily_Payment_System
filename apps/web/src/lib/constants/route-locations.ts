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

export const ROUTE_COUNTRY_CODES = ROUTE_COUNTRIES.map(
  (country) => country.code,
) as [RouteCountryCode, ...RouteCountryCode[]];

export const OTHER_ROUTE_CITY_VALUE = "__other__";

export function getRouteStates(countryCode: string) {
  return State.getStatesOfCountry(countryCode).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function getRouteCities(countryCode: string, departmentCode: string) {
  if (!countryCode || !departmentCode) return [];
  return City.getCitiesOfState(countryCode, departmentCode).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function getRouteDepartmentName(
  countryCode: string | null | undefined,
  departmentCode: string | null | undefined,
): string {
  if (!countryCode || !departmentCode) return "—";
  return (
    State.getStateByCodeAndCountry(departmentCode, countryCode)?.name ??
    departmentCode
  );
}

export function getRouteCountryName(code: string | null | undefined): string {
  if (!code) return "—";
  return ROUTE_COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

export function formatDepartmentLabel(name: string): string {
  return name
    .replace(/ Department$/i, "")
    .replace(/ Province$/i, "")
    .replace(/ Region$/i, "")
    .trim();
}

export function formatRouteLocation(
  country: string | null | undefined,
  department: string | null | undefined,
  city: string | null | undefined,
): string {
  if (!city && !department && !country) return "—";
  const parts = [
    city,
    department
      ? formatDepartmentLabel(getRouteDepartmentName(country, department))
      : null,
    country ? getRouteCountryName(country) : null,
  ].filter(Boolean);
  return parts.join(", ");
}

export function resolveRouteCityValue(
  city: string,
  cityCustom?: string,
): string {
  if (city === OTHER_ROUTE_CITY_VALUE) {
    return cityCustom?.trim() ?? "";
  }
  return city.trim();
}

export function routeFormLocationValues(route: {
  country: string | null;
  department: string | null;
  city: string | null;
}) {
  if (!route.country || !route.department || !route.city) {
    return {
      country: undefined as RouteCountryCode | undefined,
      department: "",
      city: "",
      cityCustom: "",
    };
  }

  const cities = getRouteCities(route.country, route.department);
  const isKnown = cities.some((entry) => entry.name === route.city);

  return {
    country: route.country as RouteCountryCode,
    department: route.department,
    city: isKnown ? route.city : OTHER_ROUTE_CITY_VALUE,
    cityCustom: isKnown ? "" : route.city,
  };
}
