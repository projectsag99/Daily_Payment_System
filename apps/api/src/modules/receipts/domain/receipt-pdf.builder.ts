import PDFDocument from "pdfkit";

export interface ReceiptAllocationLine {
  installmentNumber: number;
  amount: number;
}

export interface ReceiptPdfInput {
  receiptNumber: string;
  capturedAt: Date | string;
  amount: number;
  paymentMethod: string;
  clientFullName: string;
  collectorFullName: string;
  allocations: ReceiptAllocationLine[];
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  other: "Otro",
};

function formatMoney(value: number): string {
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const methodLabel =
      PAYMENT_METHOD_LABELS[input.paymentMethod] ?? input.paymentMethod;

    doc.fontSize(20).text("Recibo de pago", { align: "center" });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Número: ${input.receiptNumber}`);
    doc.text(`Fecha: ${formatDate(input.capturedAt)}`);
    doc.text(`Cliente: ${input.clientFullName}`);
    doc.text(`Cobrador: ${input.collectorFullName}`);
    doc.text(`Método: ${methodLabel}`);
    doc.moveDown();
    doc.fontSize(14).text(`Total pagado: $${formatMoney(input.amount)}`, {
      underline: true,
    });

    if (input.allocations.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text("Aplicación a cuotas:");
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const allocation of input.allocations) {
        doc.text(
          `Cuota ${allocation.installmentNumber}: $${formatMoney(allocation.amount)}`,
        );
      }
    }

    doc.end();
  });
}
