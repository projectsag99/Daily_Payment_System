export { addDaysToDate } from "./installment-schedule";

/** Returns YYYY-MM-DD in the given IANA timezone for a timestamptz column. */
export function paymentCapturedBusinessDateSql(
  column: string,
  timezone: string,
): string {
  const safeTz = timezone.replace(/'/g, "''");
  return `((${column} AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')::date`;
}

/** Compares a timestamptz column's business date to a query parameter placeholder. */
export function paymentCapturedOnDateSql(
  column: string,
  dateParam: string,
  timezone: string,
): string {
  return `${paymentCapturedBusinessDateSql(column, timezone)} = ${dateParam}::date`;
}

/** Alias for filtering any timestamp column by business date. */
export function timestampOnBusinessDateSql(
  column: string,
  dateParam: string,
  timezone: string,
): string {
  return paymentCapturedOnDateSql(column, dateParam, timezone);
}

export function isSunday(dateStr: string): boolean {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  return date.getUTCDay() === 0;
}

export function todayBusinessDate(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
