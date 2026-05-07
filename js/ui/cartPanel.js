import { loadSettings, saveSettings } from "../settings.js";
import { roundMoney } from "../domain/product.js";

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

/**
 * @param {HTMLElement} root
 * @param {object} ctx
 * @param {import('../domain/cart.js').Cart} ctx.cart
 * @param {import('../state/inventoryStore.js').InventoryStore} ctx.inventoryStore
 * @param {() => Promise<void>} ctx.onPay
 * @param {() => void} [ctx.onCartChange]
 */
export function renderCartPanel(root, ctx) {
  const { cart, inventoryStore, onPay, onCartChange } = ctx;
  const settings = loadSettings();
  const taxRate = Number(settings.taxRatePercent) || 0;

  const summary = cart.getSummary(taxRate);
  const lines = cart.getLineArray();

  const linesHtml = lines.length
    ? lines
        .map((line) => {
          const p = inventoryStore.getById(line.productId);
          const max = p?.stockQty ?? line.qty;
          return `
          <div class="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">${esc(line.name)}</div>
              <div class="font-mono text-xs text-slate-500 dark:text-slate-400">${esc(line.productId)}</div>
              <div class="text-sm text-slate-600 dark:text-slate-300">$${line.unitPrice.toFixed(2)} each</div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="qty-down min-h-11 min-w-11 rounded-xl border border-slate-200 text-lg font-semibold dark:border-slate-700" data-id="${esc(line.productId)}">−</button>
              <input type="number" min="0" class="qty-input w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center dark:border-slate-700 dark:bg-slate-950" data-id="${esc(line.productId)}" value="${line.qty}" />
              <button type="button" class="qty-up min-h-11 min-w-11 rounded-xl border border-slate-200 text-lg font-semibold dark:border-slate-700" data-id="${esc(line.productId)}">+</button>
              <button type="button" class="remove min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-medium dark:bg-slate-800" data-id="${esc(line.productId)}">Remove</button>
            </div>
            <div class="text-right font-semibold sm:min-w-[72px]">$${(line.unitPrice * line.qty).toFixed(2)}</div>
          </div>`;
        })
        .join("")
    : `<p class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Cart is empty. Tap a product to add.</p>`;

  root.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 class="text-lg font-semibold">Cart</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">Discount and tax apply before payment.</p>
      </div>
      <div class="max-h-[40vh] overflow-y-auto px-4 sm:max-h-[50vh]" id="cart-lines">${linesHtml}</div>
      <div class="space-y-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Discount type</label>
            <select id="cart-discount-type" class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
              <option value="percent" ${cart.discount.type === "percent" ? "selected" : ""}>Percent %</option>
              <option value="fixed" ${cart.discount.type === "fixed" ? "selected" : ""}>Fixed $</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Discount value</label>
            <input id="cart-discount-value" type="number" min="0" step="0.01" class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" value="${cart.discount.value}" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Tax rate (%)</label>
          <input id="cart-tax-rate" type="number" min="0" step="0.01" class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" value="${taxRate}" />
        </div>
        <div class="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
          <div class="flex justify-between py-1"><span>Subtotal</span><span>$${summary.subtotal.toFixed(2)}</span></div>
          <div class="flex justify-between py-1 text-rose-600 dark:text-rose-400"><span>Discount</span><span>−$${summary.discount.amount.toFixed(2)}</span></div>
          <div class="flex justify-between py-1"><span>Tax (${summary.taxRatePercent.toFixed(2)}%)</span><span>$${summary.taxAmount.toFixed(2)}</span></div>
          <div class="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-bold dark:border-slate-800"><span>Total</span><span>$${summary.grandTotal.toFixed(2)}</span></div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <button type="button" id="btn-pay" class="min-h-12 flex-1 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white shadow-sm hover:bg-emerald-500">Pay</button>
          <button type="button" id="btn-clear-cart" class="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 font-semibold dark:border-slate-700 dark:bg-slate-800">Clear</button>
        </div>
      </div>
    </div>
  `;

  const discountTypeEl = root.querySelector("#cart-discount-type");
  const discountValEl = root.querySelector("#cart-discount-value");
  const taxEl = root.querySelector("#cart-tax-rate");

  function readTaxAndSummary() {
    const tr = Number(taxEl?.value) || 0;
    saveSettings({ taxRatePercent: roundMoney(tr) });
    cart.setDiscount(discountTypeEl.value, Number(discountValEl.value) || 0);
    return cart.getSummary(tr);
  }

  function updateTotalsOnly() {
    const s = readTaxAndSummary();
    const box = root.querySelector(".rounded-xl.bg-slate-50");
    if (!box) return;
    box.innerHTML = `
      <div class="flex justify-between py-1"><span>Subtotal</span><span>$${s.subtotal.toFixed(2)}</span></div>
      <div class="flex justify-between py-1 text-rose-600 dark:text-rose-400"><span>Discount</span><span>−$${s.discount.amount.toFixed(2)}</span></div>
      <div class="flex justify-between py-1"><span>Tax (${s.taxRatePercent.toFixed(2)}%)</span><span>$${s.taxAmount.toFixed(2)}</span></div>
      <div class="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-bold dark:border-slate-800"><span>Total</span><span>$${s.grandTotal.toFixed(2)}</span></div>
    `;
  }

  discountTypeEl?.addEventListener("change", () => {
    cart.setDiscount(discountTypeEl.value, Number(discountValEl.value) || 0);
    updateTotalsOnly();
  });
  discountValEl?.addEventListener("input", updateTotalsOnly);
  taxEl?.addEventListener("input", updateTotalsOnly);

  root.querySelectorAll(".qty-down").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const line = cart.getLineArray().find((l) => l.productId === id);
      if (!line) return;
      const p = inventoryStore.getById(id);
      const max = p?.stockQty ?? 0;
      cart.setLineQty(id, line.qty - 1, max);
      renderCartPanel(root, ctx);
      onCartChange?.();
    });
  });

  root.querySelectorAll(".qty-up").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const line = cart.getLineArray().find((l) => l.productId === id);
      const p = inventoryStore.getById(id);
      if (!p) return;
      const max = p.stockQty;
      cart.setLineQty(id, (line?.qty ?? 0) + 1, max);
      const after = cart.getLineArray().find((l) => l.productId === id);
      if (after && after.qty < (line?.qty ?? 0) + 1) {
        window.Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "Stock limit reached",
          showConfirmButton: false,
          timer: 2000,
        });
      }
      renderCartPanel(root, ctx);
      onCartChange?.();
    });
  });

  root.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.getAttribute("data-id");
      const p = inventoryStore.getById(id);
      const max = p?.stockQty ?? 0;
      const v = Number(input.value);
      cart.setLineQty(id, v, max);
      renderCartPanel(root, ctx);
      onCartChange?.();
    });
  });

  root.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      cart.removeLine(id);
      renderCartPanel(root, ctx);
      onCartChange?.();
    });
  });

  root.querySelector("#btn-clear-cart")?.addEventListener("click", async () => {
    const r = await window.Swal.fire({
      icon: "question",
      title: "Clear cart?",
      showCancelButton: true,
      confirmButtonText: "Clear",
    });
    if (!r.isConfirmed) return;
    cart.clear();
    renderCartPanel(root, ctx);
    onCartChange?.();
  });

  root.querySelector("#btn-pay")?.addEventListener("click", async () => {
    readTaxAndSummary();
    await onPay();
  });
}
