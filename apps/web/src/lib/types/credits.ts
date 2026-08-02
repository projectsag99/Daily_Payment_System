import { CreditStatus } from "@/lib/constants";

export interface Credit {
  id: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  principalAmount: number;
  interestRate: number | null;
  totalInstallments: number;
  installmentAmount: number;
  startDate: string;
  status: CreditStatus;
  notes: string | null;
  paidInstallments: number;
  totalPaid: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  overdueAt: string | null;
}
