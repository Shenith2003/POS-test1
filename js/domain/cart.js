import { roundMoney } from "./product.js";

/**
 * Cart line: merged by productId. Tax applies to subtotal AFTER discount.
 */

export class Cart {
  constructor() {
    /** @type {Map<string, { productId: string, name: string, unitPrice: number, qty: number }>} */
    this.lines = new Map();
    /** @type {{ type: 'percent' | 'fixed', value: number }} */
    this.discount = { type: "percent", value: 0 };
  }

  clear() {
    this.lines.clear();
    this.discount = { type: "percent", value: 0 };
  }

  /**
   * @param {{ id: string, name: string, sellingPrice: number }} product
   * @param {number} addQty
   * @param {number} maxStock
   * @returns {{ added: number, capped: boolean, lineQty: number }}
   */
  addLine(product, addQty = 1, maxStock = Infinity) {
    const existing = this.lines.get(product.id);
    const current = existing?.qty ?? 0;
    const requested = current + addQty;
    const allowed = Math.min(requested, maxStock);
    const added = allowed - current;
    const capped = added < addQty;

    if (allowed <= 0) {
      return { added: 0, capped: true, lineQty: current };
    }

    this.lines.set(product.id, {
      productId: product.id,
      name: product.name,
      unitPrice: roundMoney(product.sellingPrice),
      qty: allowed,
    });

    return { added, capped, lineQty: allowed };
  }

  setLineQty(productId, qty, maxStock) {
    const line = this.lines.get(productId);
    if (!line) return { ok: false };
    const q = Math.max(0, Math.floor(Number(qty)));
    const allowed = Math.min(q, maxStock);
    if (allowed <= 0) {
      this.lines.delete(productId);
    } else {
      line.qty = allowed;
    }
    return { ok: true, capped: allowed < q };
  }

  removeLine(productId) {
    this.lines.delete(productId);
  }

  getLineArray() {
    return Array.from(this.lines.values());
  }

  setDiscount(type, value) {
    this.discount = {
      type: type === "fixed" ? "fixed" : "percent",
      value: Number(value) || 0,
    };
  }

  /**
   * Subtotal of lines before discount.
   */
  getSubtotal() {
    let sub = 0;
    for (const line of this.lines.values()) {
      sub += line.unitPrice * line.qty;
    }
    return roundMoney(sub);
  }

  /**
   * Discount amount (non-negative, capped at subtotal for fixed).
   */
  getDiscountAmount(subtotal = this.getSubtotal()) {
    const { type, value } = this.discount;
    if (subtotal <= 0) return 0;
    if (type === "fixed") {
      const v = Math.max(0, roundMoney(value));
      return roundMoney(Math.min(v, subtotal));
    }
    const pct = Math.min(100, Math.max(0, Number(value) || 0));
    return roundMoney((subtotal * pct) / 100);
  }

  /**
   * Taxable base = subtotal - discount (post-discount); tax = base * rate/100.
   */
  getSummary(taxRatePercent) {
    const subtotal = this.getSubtotal();
    const discountAmount = this.getDiscountAmount(subtotal);
    const taxableSubtotal = roundMoney(Math.max(0, subtotal - discountAmount));
    const rate = Math.max(0, Number(taxRatePercent) || 0);
    const taxAmount = roundMoney((taxableSubtotal * rate) / 100);
    const grandTotal = roundMoney(taxableSubtotal + taxAmount);

    return {
      subtotal,
      discount: {
        type: this.discount.type,
        value: this.discount.value,
        amount: discountAmount,
      },
      taxableSubtotal,
      taxRatePercent: rate,
      taxAmount,
      grandTotal,
    };
  }
}
