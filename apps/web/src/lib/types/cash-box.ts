export interface CashBoxRouteOption {
  id: string;
  name: string;
  shift: string;
}

export interface CashBoxSpreadsheetRow {
  date: string;
  dateLabel: string;
  dayName: string;
  base: number;
  entradas: Record<string, number>;
  salidas: Record<string, number>;
  salidaOficina: number;
  especificacion: string;
  totalEntradas: number;
  totalSalidas: number;
  inactive: boolean;
  isSunday: boolean;
  isHoliday: boolean;
}

export interface CashBoxSpreadsheet {
  month: string;
  title: string;
  from: string;
  to: string;
  collectorId: string;
  periodStart: string | null;
  routes: CashBoxRouteOption[];
  summary: {
    initialBalance: number;
    totalEnCaja: number;
  };
  rows: CashBoxSpreadsheetRow[];
}

export interface CashBoxInitialBalance {
  collectorId: string;
  amount: number;
  notes: string | null;
  updatedAt: string | null;
}

export interface CashBoxSummaryTotals {
  initialBalance: number;
  totalCollected: number;
  totalRenewalsOut: number;
  totalExpenses: number;
  accumulatedBalance: number;
}

export interface CashBoxDaySummary {
  date: string;
  collected: number;
  paymentsCount: number;
  renewalsOut: number;
  expensesTotal: number;
  dailyNet: number;
  accumulatedBalance: number;
}

export interface CashBoxSummary {
  from: string;
  to: string;
  periodStart: string | null;
  summary: CashBoxSummaryTotals;
  days: CashBoxDaySummary[];
  routes: CashBoxRouteOption[];
}
