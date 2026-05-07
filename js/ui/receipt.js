import { roundMoney } from "../domain/product.js";

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

/**
 * Renders transaction into #receipt-root and returns cleanup fn.
 */
export function showReceiptForPrint(receiptEl, transaction, options = {}) {
  const storeName = options.storeName ?? "Nexus Retail POS";
  const linesHtml = transaction.lines
    .map(
      (l) => `
    <tr>
      <td>${esc(l.name)}</td>
      <td class="num">${l.qty}</td>
      <td class="num">$${formatMoney(l.unitPrice)}</td>
      <td class="num">$${formatMoney(l.lineTotal)}</td>
    </tr>`,
    )
    .join("");

  const disc = transaction.discount?.amount
    ? `
    <div class="row">
      <span>Discount (${discountLabel(transaction.discount)})</span>
      <span>−$${formatMoney(transaction.discount.amount)}</span>
    </div>`
    : "";

  receiptEl.innerHTML = `
    <div class="receipt-wrap">
      <div class="brand">${esc(storeName)}</div>
      <div class="meta">Receipt #${esc(String(transaction.receiptNo))}</div>
      <div class="meta">${esc(new Date(transaction.createdAt).toLocaleString())}</div>
      <div class="meta">Txn ${esc(transaction.id)}</div>
      <table class="lines">
        <thead>
          <tr>
            <th>Item</th>
            <th class="num">Qty</th>
            <th class="num">Price</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>$${formatMoney(transaction.subtotal)}</span></div>
        ${disc}
        <div class="row"><span>Tax (${formatMoney(transaction.taxRatePercent)}%)</span><span>$${formatMoney(transaction.taxAmount)}</span></div>
        <div class="row grand"><span>Total</span><span>$${formatMoney(transaction.grandTotal)}</span></div>
      </div>
      <p class="thanks">Thank you for your purchase.</p>
    </div>
    <style>
      .receipt-wrap { max-width: 72mm; margin: 0 auto; }
      .brand { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 6px; }
      .meta { font-size: 11px; color: #444; text-align: center; margin-bottom: 2px; }
      table.lines { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
      table.lines th { text-align: left; border-bottom: 1px solid #ccc; padding: 4px 0; }
      table.lines td { padding: 4px 0; border-bottom: 1px solid #eee; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .totals { font-size: 12px; margin-top: 8px; }
      .totals .row { display: flex; justify-content: space-between; margin: 4px 0; }
      .totals .grand { font-weight: 700; font-size: 14px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #999; }
      .thanks { text-align: center; margin-top: 14px; font-size: 11px; color: #555; }
    </style>
  `;

  receiptEl.classList.add("receipt-ready");
  receiptEl.removeAttribute("aria-hidden");

  const cleanup = () => {
    receiptEl.innerHTML = "";
    receiptEl.classList.remove("receipt-ready");
    receiptEl.setAttribute("aria-hidden", "true");
  };

  return cleanup;
}

function formatMoney(n) {
  return roundMoney(Number(n) || 0).toFixed(2);
}

function discountLabel(d) {
  if (!d) return "";
  if (d.type === "fixed") return `$${formatMoney(d.value)}`;
  return `${formatMoney(d.value)}%`;
}
