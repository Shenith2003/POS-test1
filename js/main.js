/**
 * Application entry: stores, cart, tab navigation, checkout + print.
 */

import { Cart } from "./domain/cart.js";
import { createTransaction, makeTransactionId } from "./domain/transaction.js";
import { loadSettings, takeNextReceiptNo } from "./settings.js";
import { InventoryStore } from "./state/inventoryStore.js";
import { SalesStore } from "./state/salesStore.js";
import { initTheme } from "./ui/theme.js";
import { renderDashboard } from "./ui/dashboard.js";
import { bindPos } from "./ui/pos.js";
import { renderCartPanel } from "./ui/cartPanel.js";
import { renderReports } from "./ui/reports.js";
import { showReceiptForPrint } from "./ui/receipt.js";

const inventoryStore = new InventoryStore();
const salesStore = new SalesStore();
inventoryStore.ensureLoaded();
salesStore.ensureLoaded();

const cart = new Cart();

const receiptEl = document.getElementById("receipt-root");
const dashboardRoot = document.getElementById("dashboard-root");
const reportsRoot = document.getElementById("reports-root");
const cartRoot = document.getElementById("cart-panel-root");

const cartCtx = {
  cart,
  inventoryStore,
  onPay: handlePay,
  onCartChange: refreshCart,
};

function refreshCart() {
  renderCartPanel(cartRoot, cartCtx);
}

function refreshReports() {
  renderReports(reportsRoot, salesStore);
}

/** Payment: validate, persist sale, print receipt, clear cart. */
async function handlePay() {
  const tax = Number(loadSettings().taxRatePercent) || 0;
  const summary = cart.getSummary(tax);
  const lines = cart.getLineArray();

  if (!lines.length) {
    await window.Swal.fire({
      icon: "info",
      title: "Cart empty",
      text: "Add items before paying.",
    });
    return;
  }

  const subtotal = summary.subtotal;
  const dType = document.querySelector("#cart-discount-type")?.value ?? "percent";
  const dVal = Number(document.querySelector("#cart-discount-value")?.value || 0);
  if (dType === "fixed" && dVal > subtotal + 1e-9) {
    await window.Swal.fire({
      icon: "error",
      title: "Invalid discount",
      text: "Fixed discount cannot exceed subtotal.",
    });
    return;
  }

  for (const line of lines) {
    const p = inventoryStore.getById(line.productId);
    if (!p) {
      await window.Swal.fire({ icon: "error", title: "Missing product", text: line.productId });
      syncCartToStock();
      refreshCart();
      return;
    }
    if (p.stockQty < line.qty) {
      await window.Swal.fire({
        icon: "error",
        title: "Insufficient stock",
        html: `Adjust quantities for <strong>${line.name}</strong> (available: ${p.stockQty}).`,
      });
      syncCartToStock();
      refreshCart();
      posApi.refresh();
      return;
    }
  }

  const deductions = lines.map((l) => ({ productId: l.productId, qty: l.qty }));
  const inv = inventoryStore.applyStockDeductions(deductions);
  if (!inv.ok) {
    await window.Swal.fire({ icon: "error", title: "Could not update stock", text: inv.reason });
    return;
  }

  const receiptNo = takeNextReceiptNo();
  const transaction = createTransaction({
    id: makeTransactionId(),
    createdAt: new Date().toISOString(),
    receiptNo,
    lines,
    summary,
  });

  salesStore.append(transaction);

  const cleanup = showReceiptForPrint(receiptEl, transaction);
  requestAnimationFrame(() => {
    window.print();
  });
  window.addEventListener(
    "afterprint",
    () => {
      cleanup();
    },
    { once: true },
  );

  cart.clear();
  refreshCart();
  posApi.refresh();

  await window.Swal.fire({
    icon: "success",
    title: "Payment complete",
    text: `Receipt #${receiptNo}`,
    timer: 2000,
    showConfirmButton: false,
  });
}

function syncCartToStock() {
  for (const line of [...cart.getLineArray()]) {
    const p = inventoryStore.getById(line.productId);
    if (!p) {
      cart.removeLine(line.productId);
    } else {
      cart.setLineQty(line.productId, Math.min(line.qty, p.stockQty), p.stockQty);
    }
  }
}

/* ---- Initial UI ---- */

initTheme(document.getElementById("btn-theme-toggle"));

const posApi = bindPos({
  gridEl: document.getElementById("pos-product-grid"),
  searchEl: document.getElementById("pos-search"),
  chipsEl: document.getElementById("pos-category-chips"),
  store: inventoryStore,
  cart,
  onCartChange: () => refreshCart(),
});

renderDashboard(dashboardRoot, inventoryStore);
refreshCart();
refreshReports();

inventoryStore.subscribe(() => {
  renderDashboard(dashboardRoot, inventoryStore);
});

salesStore.subscribe(() => {
  refreshReports();
});

/* ---- Tabs ---- */

const panelEls = {
  pos: document.getElementById("view-pos"),
  inventory: document.getElementById("view-inventory"),
  reports: document.getElementById("view-reports"),
};

const tabClassActive =
  "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500";
const tabClassIdle =
  "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

function activateTab(name) {
  for (const [key, el] of Object.entries(panelEls)) {
    if (!el) continue;
    const on = key === name;
    el.classList.toggle("hidden", !on);
    el.setAttribute("aria-hidden", on ? "false" : "true");
  }
  document.querySelectorAll(".tab-btn").forEach((b) => {
    const on = b.getAttribute("data-tab") === name;
    b.className =
      "tab-btn min-h-12 flex-1 rounded-xl px-4 text-sm font-semibold transition sm:flex-none sm:px-6 " +
      (on ? tabClassActive : tabClassIdle);
  });
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    if (tab) activateTab(tab);
  });
});

activateTab("pos");
