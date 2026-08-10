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

export function creditTermsToCreatePayload(
  terms: CreditTermsPreview,
  startDate: string,
) {
  return {
    principalAmount: terms.principalAmount,
    totalInstallments: terms.totalInstallments,
    installmentAmount: terms.installmentAmount,
    startDate,
    interestRate: terms.interestRate,
  };
}
