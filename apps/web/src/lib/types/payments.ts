import { PaymentStatus } from "@/lib/constants";

export type PaymentMethod = "cash" | "transfer" | "other";

export interface PaymentAllocation {
  installmentId: string;
  installmentNumber: number;
  amount: number;
}

export interface PaymentReceiptRef {
  id: string;
  status: "generating" | "ready" | "failed";
}

export interface CreatePaymentPayload {
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  capturedAt: string;
  notes?: string;
}

export interface CreatePaymentResponse {
  id: string;
  clientId: string;
  amount: number;
  status: string;
  allocations: PaymentAllocation[];
  clientVisitStatus: string;
  receipt: PaymentReceiptRef;
}

export interface PaymentSummary {
  id: string;
  clientId: string;
  collectorId: string;
  amount: number;
  paymentMethod: string;
  status: string;
  capturedAt: string;
  recordedAt: string;
}

export interface PaymentDetail extends PaymentSummary {
  notes: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  allocations: PaymentAllocation[];
}

export interface PaginatedPayments {
  data: PaymentSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListPaymentsParams {
  clientId?: string;
  collectorId?: string;
  status?: PaymentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
