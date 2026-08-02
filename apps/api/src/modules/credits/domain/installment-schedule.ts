export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
}

export function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function generateDailyInstallmentSchedule(
  startDate: string,
  totalInstallments: number,
  installmentAmount: number,
): InstallmentScheduleItem[] {
  const items: InstallmentScheduleItem[] = [];
  for (let i = 0; i < totalInstallments; i++) {
    items.push({
      installmentNumber: i + 1,
      dueDate: addDaysToDate(startDate, i),
      amountDue: roundMoney(installmentAmount),
    });
  }
  return items;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeInstallmentStatus(
  amountDue: number,
  amountPaid: number,
  dueDate: string,
  today: string,
): "pending" | "partial" | "paid" | "overdue" {
  if (amountPaid >= amountDue) {
    return "paid";
  }
  if (amountPaid > 0) {
    return "partial";
  }
  if (dueDate < today) {
    return "overdue";
  }
  return "pending";
}
