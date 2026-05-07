import { roundMoney } from "./product.js";

/**
 * Build a persisted transaction snapshot from cart summary + lines.
 */
export function createTransaction({
  id,
  createdAt,
  receiptNo,
  lines,
  summary,
}) {
  return {
    id,
    createdAt,
    receiptNo,
    lines: lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      qty: l.qty,
      unitPrice: roundMoney(l.unitPrice),
      lineTotal: roundMoney(l.unitPrice * l.qty),
    })),
    subtotal: summary.subtotal,
    discount: summary.discount,
    taxRatePercent: summary.taxRatePercent,
    taxAmount: summary.taxAmount,
    grandTotal: summary.grandTotal,
  };
}

export function makeTransactionId() {
  return `TX-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
