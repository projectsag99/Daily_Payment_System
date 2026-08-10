import {
  generateDailyInstallmentSchedule,
  applyInitialPaymentToSchedule,
  computeInstallmentStatus,
  addDaysToDate,
} from "./installment-schedule";

describe("installment-schedule", () => {
  it("generates daily installments from start date", () => {
    const schedule = generateDailyInstallmentSchedule("2026-08-01", 3, 100);
    expect(schedule).toHaveLength(3);
    expect(schedule[0]).toEqual({
      installmentNumber: 1,
      dueDate: "2026-08-01",
      amountDue: 100,
    });
    expect(schedule[2].dueDate).toBe(addDaysToDate("2026-08-01", 2));
  });

  it("computes installment status", () => {
    expect(computeInstallmentStatus(100, 100, "2026-08-01", "2026-08-05")).toBe(
      "paid",
    );
    expect(computeInstallmentStatus(100, 50, "2026-08-01", "2026-08-05")).toBe(
      "partial",
    );
    expect(computeInstallmentStatus(100, 0, "2026-07-01", "2026-08-05")).toBe(
      "overdue",
    );
  });

  it("applies initial payment across installments in order", () => {
    const schedule = generateDailyInstallmentSchedule("2026-08-01", 4, 100);
    const withPayment = applyInitialPaymentToSchedule(schedule, 250);

    expect(withPayment[0]).toMatchObject({
      amountPaid: 100,
      status: "paid",
    });
    expect(withPayment[1]).toMatchObject({
      amountPaid: 100,
      status: "paid",
    });
    expect(withPayment[2]).toMatchObject({
      amountPaid: 50,
      status: "partial",
    });
    expect(withPayment[3]).toMatchObject({
      amountPaid: 0,
      status: "pending",
    });
  });
});
