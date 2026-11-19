import { FeeItem, PaymentTransaction, Patient } from "@/lib/mockData";

export interface PatientFinancialSummary {
  gross: number;
  discount: number;
  billed: number;
  paid: number;
  refunded: number;
  netPaid: number;
  due: number;
  isSettled: boolean;
}

export interface FeeSettlement {
  status: "paid" | "partial" | "unpaid";
  allocatedAmount: number;
  balanceDue: number;
}

/**
 * Computes FIFO fee settlement for a patient based on chronological payments.
 * When total payments >= cumulative fee amounts, earlier fees are fully "paid".
 * When a fee is partially covered, status is "partial".
 * Any remaining fees are "unpaid".
 */
export function calculateFeeSettlements(
  patientFees: FeeItem[],
  patientPayments: PaymentTransaction[]
): Map<string, FeeSettlement> {
  const result = new Map<string, FeeSettlement>();
  const grossPaid = patientPayments
    .filter((p) => !p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = patientPayments
    .filter((p) => p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = Math.max(0, grossPaid - totalRefunded);

  // Sort fees chronologically (by date ascending, then ID)
  const sortedFees = [...patientFees].sort((a, b) => {
    const dComp = (a.date || "").localeCompare(b.date || "");
    if (dComp !== 0) return dComp;
    return (a._id || "").localeCompare(b._id || "");
  });

  let remainingPayment = totalPaid;

  for (const fee of sortedFees) {
    const net = Math.max(0, fee.netAmount);
    if (net === 0) {
      result.set(fee._id, { status: "paid", allocatedAmount: 0, balanceDue: 0 });
      continue;
    }

    if (remainingPayment >= net) {
      result.set(fee._id, { status: "paid", allocatedAmount: net, balanceDue: 0 });
      remainingPayment -= net;
    } else if (remainingPayment > 0) {
      result.set(fee._id, {
        status: "partial",
        allocatedAmount: remainingPayment,
        balanceDue: net - remainingPayment,
      });
      remainingPayment = 0;
    } else {
      result.set(fee._id, { status: "unpaid", allocatedAmount: 0, balanceDue: net });
    }
  }

  return result;
}

/**
 * Calculates unified financial summary for a patient or overall clinic fees/payments.
 */
export function calculateFinancialSummary(
  fees: FeeItem[],
  payments: PaymentTransaction[],
  patientId?: string
): PatientFinancialSummary {
  const pFees = patientId ? fees.filter((f) => f.patientId === patientId) : fees;
  const pPayments = patientId ? payments.filter((p) => p.patientId === patientId) : payments;

  let gross = 0;
  let discount = 0;
  let billed = 0;
  for (const f of pFees) {
    gross += f.amount || 0;
    discount += f.discount || 0;
    billed += f.netAmount ?? Math.max(0, (f.amount || 0) - (f.discount || 0));
  }

  let paid = 0;
  let refunded = 0;
  for (const p of pPayments) {
    if (p.isRefund) {
      refunded += p.amount || 0;
    } else {
      paid += p.amount || 0;
    }
  }

  const netPaid = Math.max(0, paid - refunded);
  const due = Math.max(0, billed - netPaid);

  return {
    gross,
    discount,
    billed,
    paid,
    refunded,
    netPaid,
    due,
    isSettled: due <= 0,
  };
}

/**
 * Builds an O(N) lookup map of patientId -> outstanding due balance.
 * Eliminates O(patients * (fees + payments)) filtering in sort and render loops.
 */
export function buildPatientBalanceMap(
  patients: Patient[],
  fees: FeeItem[],
  payments: PaymentTransaction[]
): Map<string, number> {
  const billedMap = new Map<string, number>();
  for (const f of fees) {
    const prev = billedMap.get(f.patientId) || 0;
    billedMap.set(f.patientId, prev + (f.netAmount ?? Math.max(0, (f.amount || 0) - (f.discount || 0))));
  }

  const paidMap = new Map<string, number>();
  for (const p of payments) {
    const prev = paidMap.get(p.patientId) || 0;
    if (p.isRefund) {
      paidMap.set(p.patientId, Math.max(0, prev - (p.amount || 0)));
    } else {
      paidMap.set(p.patientId, prev + (p.amount || 0));
    }
  }

  const result = new Map<string, number>();
  for (const pat of patients) {
    const billed = billedMap.get(pat._id) || 0;
    const paid = paidMap.get(pat._id) || 0;
    result.set(pat._id, Math.max(0, billed - paid));
  }

  return result;
}

/**
 * Standard Indian Rupee currency formatter.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

