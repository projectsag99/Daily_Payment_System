import {
  ROUTE_COUNTRY_CURRENCIES,
  CURRENCY_LABELS,
  getCurrencyForCountry,
  getCurrencyLabel,
  getFractionDigitsForCurrency,
  getLocaleForCurrency,
} from "@/lib/constants/currencies";

export {
  ROUTE_COUNTRY_CURRENCIES,
  CURRENCY_LABELS,
  getCurrencyForCountry,
  getCurrencyLabel,
  getFractionDigitsForCurrency,
  getLocaleForCurrency,
};

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: number, currency = "COP"): string {
  if (!moneyFormatters.has(currency)) {
    moneyFormatters.set(
      currency,
      new Intl.NumberFormat(getLocaleForCurrency(currency), {
        style: "currency",
        currency,
        maximumFractionDigits: getFractionDigitsForCurrency(currency),
        minimumFractionDigits: getFractionDigitsForCurrency(currency),
      }),
    );
  }
  return moneyFormatters.get(currency)!.format(value);
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
  });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  });
}
