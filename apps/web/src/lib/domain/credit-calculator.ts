import { getFractionDigitsForCurrency } from "@/lib/constants/currencies";

export interface CreditTermsInput {
  amount: number;
  interestPercent: number;
  totalInstallments: number;
  amountAlreadyPaid?: number;
  currency?: string;
}

export interface CreditTermsPreview {
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  totalToPay: number;
  amountAlreadyPaid: number;
  remainingBalance: number;
  totalInstallments: number;
  installmentAmount: number;
}

export function roundMoney(value: number, fractionDigits = 2): number {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

export function computeCreditTerms(
  input: CreditTermsInput,
): CreditTermsPreview {
  const fractionDigits = getFractionDigitsForCurrency(input.currency ?? "COP");
  const principalAmount = roundMoney(input.amount, fractionDigits);
  const interestRate = input.interestPercent;
  const interestAmount = roundMoney(
    principalAmount * (interestRate / 100),
    fractionDigits,
  );
  const totalToPay = roundMoney(principalAmount + interestAmount, fractionDigits);
  const rawInstallment = totalToPay / input.totalInstallments;
  const installmentAmount =
    fractionDigits === 0
      ? Math.ceil(rawInstallment)
      : roundMoney(rawInstallment, fractionDigits);

  const estimatedTotal = roundMoney(
    installmentAmount * input.totalInstallments,
    fractionDigits,
  );
  const amountAlreadyPaid = roundMoney(
    Math.max(0, input.amountAlreadyPaid ?? 0),
    fractionDigits,
  );
  const remainingBalance = roundMoney(
    Math.max(0, estimatedTotal - amountAlreadyPaid),
    fractionDigits,
  );

  return {
    principalAmount,
    interestRate,
    interestAmount,
    totalToPay: estimatedTotal,
    amountAlreadyPaid,
    remainingBalance,
    totalInstallments: input.totalInstallments,
    installmentAmount,
  };
}

export interface CreateCreditApiPayload {
  principalAmount: number;
  totalInstallments: number;
  installmentAmount: number;
  startDate: string;
  interestRate?: number;
  amountAlreadyPaid?: number;
  notes?: string;
  routeId?: string;
}

export function creditTermsToCreatePayload(
  terms: CreditTermsPreview,
  options: {
    startDate: string;
    amountAlreadyPaid?: number;
    notes?: string;
    routeId?: string;
  },
): CreateCreditApiPayload {
  return {
    principalAmount: terms.principalAmount,
    totalInstallments: terms.totalInstallments,
    installmentAmount: terms.installmentAmount,
    startDate: options.startDate,
    interestRate: terms.interestRate,
    amountAlreadyPaid: options.amountAlreadyPaid,
    notes: options.notes,
    routeId: options.routeId,
  };
}

export function buildCreateCreditPayload(
  values: {
    creditAmount: number;
    creditInterestPercent: number;
    creditInstallments: number;
    creditStartDate: string;
    creditAmountAlreadyPaid?: number;
    notes?: string;
    routeId?: string;
  },
  currency: string,
): CreateCreditApiPayload {
  const amountAlreadyPaid = values.creditAmountAlreadyPaid ?? 0;
  const terms = computeCreditTerms({
    amount: values.creditAmount,
    interestPercent: values.creditInterestPercent,
    totalInstallments: values.creditInstallments,
    amountAlreadyPaid,
    currency,
  });

  if (amountAlreadyPaid > terms.totalToPay) {
    throw new Error("PAID_EXCEEDS_TOTAL");
  }

  return creditTermsToCreatePayload(terms, {
    startDate: values.creditStartDate,
    amountAlreadyPaid: amountAlreadyPaid > 0 ? amountAlreadyPaid : undefined,
    notes: values.notes,
    routeId: values.routeId,
  });
}
