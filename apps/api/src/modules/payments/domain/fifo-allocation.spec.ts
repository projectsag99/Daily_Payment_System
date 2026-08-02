import {
  allocatePaymentFifo,
  sumAllocations,
} from "./fifo-allocation";

describe("fifo-allocation", () => {
  const installments = [
    {
      id: "i1",
      installmentNumber: 1,
      dueDate: "2026-08-01",
      amountDue: 100,
      amountPaid: 0,
    },
    {
      id: "i2",
      installmentNumber: 2,
      dueDate: "2026-08-02",
      amountDue: 100,
      amountPaid: 0,
    },
  ];

  it("allocates FIFO to oldest installments first", () => {
    const plans = allocatePaymentFifo(150, installments);
    expect(plans).toEqual([
      { installmentId: "i1", installmentNumber: 1, amount: 100 },
      { installmentId: "i2", installmentNumber: 2, amount: 50 },
    ]);
    expect(sumAllocations(plans)).toBe(150);
  });

  it("supports partial payment on first installment", () => {
    const plans = allocatePaymentFifo(40, installments);
    expect(plans).toEqual([
      { installmentId: "i1", installmentNumber: 1, amount: 40 },
    ]);
  });

  it("respects explicit installment order when provided", () => {
    const plans = allocatePaymentFifo(100, installments, ["i2", "i1"]);
    expect(plans[0].installmentId).toBe("i2");
  });
});
