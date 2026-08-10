import { roundMoney } from "../../credits/domain/installment-schedule";

export interface AllocatableInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
}

export interface PaymentAllocationPlan {
  installmentId: string;
  installmentNumber: number;
  amount: number;
}

export function allocatePaymentFifo(
  paymentAmount: number,
  installments: AllocatableInstallment[],
  explicitInstallmentIds?: string[],
): PaymentAllocationPlan[] {
  if (paymentAmount <= 0) {
    return [];
  }

  let ordered = [...installments].sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return a.installmentNumber - b.installmentNumber;
  });

  if (explicitInstallmentIds?.length) {
    const byId = new Map(ordered.map((item) => [item.id, item]));
    ordered = explicitInstallmentIds
      .map((id) => byId.get(id))
      .filter((item): item is AllocatableInstallment => item !== undefined);
  }

  const plans: PaymentAllocationPlan[] = [];
  let remaining = roundMoney(paymentAmount);

  for (const installment of ordered) {
    if (remaining <= 0) {
      break;
    }
    const outstanding = roundMoney(installment.amountDue - installment.amountPaid);
    if (outstanding <= 0) {
      continue;
    }
    const applied = roundMoney(Math.min(remaining, outstanding));
    plans.push({
      installmentId: installment.id,
      installmentNumber: installment.installmentNumber,
      amount: applied,
    });
    remaining = roundMoney(remaining - applied);
  }

  return plans;
}

export function sumAllocations(plans: PaymentAllocationPlan[]): number {
  return roundMoney(plans.reduce((sum, plan) => sum + plan.amount, 0));
}
