function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

/**
 * @param {HTMLElement} root
 * @param {import('../state/salesStore.js').SalesStore} salesStore
 */
export function renderReports(root, salesStore) {
  const total = salesStore.getTotalRevenue();
  const txs = salesStore.getSortedDesc();

  const rows = txs
    .map((t) => {
      return `
      <tr class="border-b border-slate-100 dark:border-slate-800">
        <td class="px-3 py-3 font-mono text-xs">${esc(t.id)}</td>
        <td class="px-3 py-3 whitespace-nowrap">${esc(new Date(t.createdAt).toLocaleString())}</td>
        <td class="px-3 py-3 font-medium">#${esc(String(t.receiptNo))}</td>
        <td class="px-3 py-3 text-right font-semibold">$${Number(t.grandTotal).toFixed(2)}</td>
        <td class="px-3 py-3 text-right">
          <button type="button" class="btn-view-tx min-h-10 rounded-lg bg-slate-100 px-3 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" data-id="${esc(t.id)}">Details</button>
        </td>
      </tr>`;
    })
    .join("");

  root.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg">
      <p class="text-sm font-medium text-indigo-100">Total revenue (all time)</p>
      <p class="mt-2 text-4xl font-bold tracking-tight">$${total.toFixed(2)}</p>
      <p class="mt-2 text-xs text-indigo-200">${txs.length} transaction${txs.length === 1 ? "" : "s"} recorded</p>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <h2 class="text-lg font-semibold">Past orders</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Newest first · stored in this browser</p>
      </div>
      <div class="overflow-x-auto p-2">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th class="px-3 py-2">Transaction ID</th>
              <th class="px-3 py-2">Date</th>
              <th class="px-3 py-2">Receipt</th>
              <th class="px-3 py-2 text-right">Total</th>
              <th class="px-3 py-2 text-right"> </th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="5" class="px-3 py-10 text-center text-slate-500">No sales yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  root.querySelectorAll(".btn-view-tx").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const t = txs.find((x) => x.id === id);
      if (!t) return;
      const lines = t.lines
        .map(
          (l) =>
            `<tr><td class="py-1 pr-4">${esc(l.name)}</td><td class="py-1">${l.qty}</td><td class="py-1 text-right">$${Number(l.lineTotal).toFixed(2)}</td></tr>`,
        )
        .join("");
      window.Swal.fire({
        title: `Receipt #${t.receiptNo}`,
        html: `
          <div class="text-left text-sm">
            <p class="mb-2 text-slate-500">${esc(new Date(t.createdAt).toLocaleString())}</p>
            <table class="w-full text-left">
              <thead><tr><th>Item</th><th>Qty</th><th class="text-right">Total</th></tr></thead>
              <tbody>${lines}</tbody>
            </table>
            <p class="mt-3 flex justify-between"><span>Subtotal</span><span>$${Number(t.subtotal).toFixed(2)}</span></p>
            <p class="flex justify-between text-rose-600"><span>Discount</span><span>−$${Number(t.discount?.amount ?? 0).toFixed(2)}</span></p>
            <p class="flex justify-between"><span>Tax (${Number(t.taxRatePercent).toFixed(2)}%)</span><span>$${Number(t.taxAmount).toFixed(2)}</span></p>
            <p class="mt-2 flex justify-between text-lg font-bold"><span>Grand total</span><span>$${Number(t.grandTotal).toFixed(2)}</span></p>
          </div>
        `,
        width: 480,
      });
    });
  });
}
