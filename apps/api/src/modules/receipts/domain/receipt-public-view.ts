export interface ReceiptPublicSource {
  receiptNumber: string;
  capturedAt: Date | string;
  amount: number;
  collectorFirstName: string;
  clientFirstName: string;
  paymentMethod: string;
}

export interface ReceiptPublicView {
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  collectorFirstName: string;
  clientFirstName: string;
}

export function buildReceiptPublicView(
  source: ReceiptPublicSource,
): ReceiptPublicView {
  const capturedAt =
    source.capturedAt instanceof Date
      ? source.capturedAt
      : new Date(source.capturedAt);

  return {
    receiptNumber: source.receiptNumber,
    date: capturedAt.toISOString(),
    amount: source.amount,
    paymentMethod: source.paymentMethod,
    collectorFirstName: source.collectorFirstName,
    clientFirstName: source.clientFirstName,
  };
}
