import type { RouteCountryCode } from "@/lib/constants/route-locations";

export const ROUTE_COUNTRY_CURRENCIES: Record<RouteCountryCode, string> = {
  CO: "COP",
  UY: "UYU",
  AR: "ARS",
  EC: "USD",
  PE: "PEN",
  MX: "MXN",
  CL: "CLP",
  VE: "VES",
  PA: "USD",
  CR: "CRC",
  BO: "BOB",
  PY: "PYG",
};

export const CURRENCY_LABELS: Record<string, string> = {
  COP: "Peso colombiano (COP)",
  UYU: "Peso uruguayo (UYU)",
  ARS: "Peso argentino (ARS)",
  USD: "Dólar (USD)",
  PEN: "Sol peruano (PEN)",
  MXN: "Peso mexicano (MXN)",
  CLP: "Peso chileno (CLP)",
  VES: "Bolívar (VES)",
  CRC: "Colón costarricense (CRC)",
  BOB: "Boliviano (BOB)",
  PYG: "Guaraní (PYG)",
};

const CURRENCY_LOCALES: Record<string, string> = {
  COP: "es-CO",
  UYU: "es-UY",
  ARS: "es-AR",
  USD: "es-EC",
  PEN: "es-PE",
  MXN: "es-MX",
  CLP: "es-CL",
  VES: "es-VE",
  CRC: "es-CR",
  BOB: "es-BO",
  PYG: "es-PY",
};

const CURRENCY_FRACTION_DIGITS: Record<string, number> = {
  COP: 0,
  UYU: 0,
  CLP: 0,
  CRC: 0,
  PYG: 0,
  ARS: 2,
  USD: 2,
  PEN: 2,
  MXN: 2,
  VES: 2,
  BOB: 2,
};

export function getCurrencyForCountry(countryCode: string): string | null {
  if (!(countryCode in ROUTE_COUNTRY_CURRENCIES)) {
    return null;
  }
  return ROUTE_COUNTRY_CURRENCIES[countryCode as RouteCountryCode];
}

export function getCurrencyLabel(currency: string): string {
  return CURRENCY_LABELS[currency] ?? currency;
}

export function getLocaleForCurrency(currency: string): string {
  return CURRENCY_LOCALES[currency] ?? "es-CO";
}

export function getFractionDigitsForCurrency(currency: string): number {
  return CURRENCY_FRACTION_DIGITS[currency] ?? 2;
}
