import { buildReceiptPublicView } from "./receipt-public-view";

describe("buildReceiptPublicView", () => {
  it("returns only minimal public fields", () => {
    const view = buildReceiptPublicView({
      receiptNumber: "RCP-001",
      capturedAt: "2026-08-01T15:30:00.000Z",
      amount: 150,
      collectorFirstName: "Juan",
      clientFirstName: "María",
      paymentMethod: "cash",
    });

    expect(view).toEqual({
      receiptNumber: "RCP-001",
      date: "2026-08-01T15:30:00.000Z",
      amount: 150,
      paymentMethod: "cash",
      collectorFirstName: "Juan",
      clientFirstName: "María",
    });
  });
});
