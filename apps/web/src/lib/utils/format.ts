const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
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
