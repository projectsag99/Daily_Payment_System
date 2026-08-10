import { City, Country, State } from "country-state-city";

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

export interface GeoPoint {
  lat: number;
  lng: number;
}

const COUNTRY_MAP_CENTERS: Record<RouteCountryCode, GeoPoint> = {
  CO: { lat: 4.6097, lng: -74.0817 },
  UY: { lat: -34.9011, lng: -56.1645 },
  AR: { lat: -34.6037, lng: -58.3816 },
  EC: { lat: -0.1807, lng: -78.4678 },
  PE: { lat: -12.0464, lng: -77.0428 },
  MX: { lat: 19.4326, lng: -99.1332 },
  CL: { lat: -33.4489, lng: -70.6693 },
  VE: { lat: 10.4806, lng: -66.9036 },
  PA: { lat: 8.9824, lng: -79.5199 },
  CR: { lat: 9.9281, lng: -84.0907 },
  BO: { lat: -16.4897, lng: -68.1193 },
  PY: { lat: -25.2637, lng: -57.5759 },
};

export function getCountryMapCenter(countryCode?: string): GeoPoint {
  if (countryCode && countryCode in COUNTRY_MAP_CENTERS) {
    return COUNTRY_MAP_CENTERS[countryCode as RouteCountryCode];
  }
  return COUNTRY_MAP_CENTERS.CO;
}

export interface LocationMapView {
  center: GeoPoint;
  zoom: number;
  label?: string;
}

function parseCoordinate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getCityCoordinates(
  countryCode: string,
  departmentCode: string,
  cityName: string,
): GeoPoint | null {
  const normalizedCity = cityName.trim().toLowerCase();
  if (!normalizedCity) return null;

  const cities = getRouteCities(countryCode, departmentCode);
  const match =
    cities.find((entry) => entry.name.toLowerCase() === normalizedCity) ??
    cities.find(
      (entry) =>
        entry.name.toLowerCase().includes(normalizedCity) ||
        normalizedCity.includes(entry.name.toLowerCase()),
    );

  if (!match) return null;

  const lat = parseCoordinate(match.latitude);
  const lng = parseCoordinate(match.longitude);
  if (lat === null || lng === null) return null;

  return { lat, lng };
}

export function getDepartmentMapCenter(
  countryCode: string,
  departmentCode: string,
): GeoPoint | null {
  const state = State.getStateByCodeAndCountry(departmentCode, countryCode);
  const lat = parseCoordinate(state?.latitude);
  const lng = parseCoordinate(state?.longitude);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

export function getLocationMapView(input: {
  countryCode?: string;
  departmentCode?: string;
  city?: string;
  cityCustom?: string;
}): LocationMapView {
  const countryCode = input.countryCode;
  if (!countryCode) {
    return {
      center: getCountryMapCenter(),
      zoom: 6,
      label: "Colombia",
    };
  }

  const cityName =
    input.city && input.city !== OTHER_ROUTE_CITY_VALUE
      ? input.city.trim()
      : input.cityCustom?.trim() ?? "";

  if (cityName && input.departmentCode) {
    const cityCoords = getCityCoordinates(
      countryCode,
      input.departmentCode,
      cityName,
    );
    if (cityCoords) {
      return {
        center: cityCoords,
        zoom: 13,
        label: cityName,
      };
    }
  }

  if (input.departmentCode) {
    const departmentCenter = getDepartmentMapCenter(
      countryCode,
      input.departmentCode,
    );
    if (departmentCenter) {
      return {
        center: departmentCenter,
        zoom: 10,
        label: formatDepartmentLabel(
          getRouteDepartmentName(countryCode, input.departmentCode),
        ),
      };
    }
  }

  return {
    center: getCountryMapCenter(countryCode),
    zoom: 6,
    label: getRouteCountryName(countryCode),
  };
}

export async function geocodeCityLocation(input: {
  countryCode: string;
  departmentCode?: string;
  cityName: string;
}): Promise<GeoPoint | null> {
  const cityName = input.cityName.trim();
  if (!cityName) return null;

  const queryParts = [
    cityName,
    input.departmentCode
      ? formatDepartmentLabel(
          getRouteDepartmentName(input.countryCode, input.departmentCode),
        )
      : null,
    getRouteCountryName(input.countryCode),
  ].filter(Boolean);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", queryParts.join(", "));
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "es",
      },
    });
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!results[0]) return null;

    const lat = parseCoordinate(results[0].lat);
    const lng = parseCoordinate(results[0].lon);
    if (lat === null || lng === null) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

export function buildGoogleMapsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps?q=${point.lat},${point.lng}`;
}

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

export function getCountryPhonePrefix(countryCode: string): string {
  return Country.getCountryByCode(countryCode)?.phonecode ?? "";
}

export function formatPhoneWithCountryPrefix(
  countryCode: string,
  localNumber: string,
): string {
  const prefix = getCountryPhonePrefix(countryCode);
  const digits = localNumber.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (!prefix) {
    return digits.startsWith("+") ? digits : `+${digits}`;
  }
  if (digits.startsWith(prefix)) {
    return `+${digits}`;
  }
  return `+${prefix}${digits}`;
}

export function stripCountryPhonePrefix(
  phone: string,
  countryCode?: string,
): string {
  const cleaned = phone.replace(/\s/g, "");
  if (countryCode) {
    const prefix = getCountryPhonePrefix(countryCode);
    if (prefix && cleaned.startsWith(`+${prefix}`)) {
      return cleaned.slice(prefix.length + 1);
    }
  }
  return cleaned.replace(/^\+\d+/, "");
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
