import {
  addDaysToDate,
  isSunday,
} from "../../credits/domain/business-days";

const WEEKDAY_NAMES_ES = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
] as const;

const MONTH_NAMES_ES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
] as const;

export function parseMonthParam(month: string): { from: string; to: string; label: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) {
    throw new Error("Invalid month format");
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) {
    throw new Error("Invalid month");
  }
  const from = `${match[1]}-${match[2]}-01`;
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const to = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`;
  const label = `CAJA MES DE ${MONTH_NAMES_ES[monthIndex - 1]} ${year}`;
  return { from, to, label };
}

export function weekdayLabelEs(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  return WEEKDAY_NAMES_ES[date.getUTCDay()];
}

export function listDatesInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDaysToDate(current, 1);
  }
  return dates;
}

export function isInactiveCashBoxDay(
  dateStr: string,
  holidayLabels: Map<string, string | null>,
): { inactive: boolean; isSunday: boolean; holidayLabel: string | null } {
  const sunday = isSunday(dateStr);
  const holidayLabel = holidayLabels.get(dateStr) ?? null;
  return {
    inactive: sunday || holidayLabel != null,
    isSunday: sunday,
    holidayLabel,
  };
}

export function formatSpreadsheetDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
