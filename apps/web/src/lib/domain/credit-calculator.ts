import { getFractionDigitsForCurrency } from "@/lib/constants/currencies";

export interface CreditTermsInput {
  amount: number;
  interestPercent: number;
  totalInstallments: number;
  currency?: string;
}

export interface CreditTermsPreview {
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  totalToPay: number;
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

  return {
    principalAmount,
    interestRate,
    interestAmount,
    totalToPay,
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
  notes?: string;
  routeId?: string;
}

export function creditTermsToCreatePayload(
  terms: CreditTermsPreview,
  options: {
    startDate: string;
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
    notes?: string;
    routeId?: string;
  },
  currency: string,
): CreateCreditApiPayload {
  const terms = computeCreditTerms({
    amount: values.creditAmount,
    interestPercent: values.creditInterestPercent,
    totalInstallments: values.creditInstallments,
    currency,
  });

  return creditTermsToCreatePayload(terms, {
    startDate: values.creditStartDate,
    notes: values.notes,
    routeId: values.routeId,
  });
}
