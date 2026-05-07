import { productMatchesQuery } from "../domain/product.js";

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.gridEl
 * @param {HTMLElement} opts.searchEl
 * @param {HTMLElement} opts.chipsEl
 * @param {import('../state/inventoryStore.js').InventoryStore} opts.store
 * @param {import('../domain/cart.js').Cart} opts.cart
 * @param {() => void} [opts.onCartChange]
 */
export function bindPos({
  gridEl,
  searchEl,
  chipsEl,
  store,
  cart,
  onCartChange,
}) {
  let category = "all";
  let query = "";

  function renderChips() {
    const cats = store.getCategories();
    const parts = [
      `<button type="button" data-cat="all" class="chip min-h-11 rounded-full border px-4 text-sm font-medium transition ${
        category === "all"
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }">All</button>`,
      ...cats.map(
        (c) =>
          `<button type="button" data-cat="${esc(c)}" class="chip min-h-11 rounded-full border px-4 text-sm font-medium transition ${
            category === c
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }">${esc(c)}</button>`,
      ),
    ];
    chipsEl.innerHTML = parts.join("");

    chipsEl.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        category = btn.getAttribute("data-cat") || "all";
        renderChips();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const products = store.getAll();
    const filtered = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      return productMatchesQuery(p, query);
    });

    if (!filtered.length) {
      gridEl.innerHTML = `<div class="col-span-full rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">No products match.</div>`;
      return;
    }

    gridEl.innerHTML = filtered
      .map((p) => {
        const out = p.stockQty <= 0;
        const low = !out && p.stockQty <= 5;
        const badge = out
          ? `<span class="mt-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:bg-rose-950 dark:text-rose-200">Out of Stock</span>`
          : low
            ? `<span class="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">${p.stockQty} left</span>`
            : `<span class="mt-2 inline-block text-[11px] text-slate-500 dark:text-slate-400">Stock: ${p.stockQty}</span>`;

        const disabled = out
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-indigo-400 hover:shadow-md active:scale-[0.99]";

        return `
        <button type="button" class="product-card flex flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition dark:border-slate-700 dark:bg-slate-900 ${disabled}"
          data-id="${esc(p.id)}" ${out ? "disabled" : ""}>
          <span class="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">${esc(p.name)}</span>
          <span class="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">${esc(p.id)}</span>
          <span class="mt-auto pt-2 text-lg font-bold text-indigo-600 dark:text-indigo-400">$${Number(p.sellingPrice).toFixed(2)}</span>
          ${badge}
        </button>`;
      })
      .join("");

    gridEl.querySelectorAll(".product-card:not([disabled])").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const p = store.getById(id);
        if (!p || p.stockQty <= 0) return;
        const inCart = cart.getLineArray().find((l) => l.productId === id);
        const max = p.stockQty;
        const current = inCart?.qty ?? 0;
        const addQty = 1;
        const { added, capped } = cart.addLine(p, addQty, max);
        if (added === 0) {
          window.Swal.fire({
            icon: "info",
            title: "No stock",
            text: `${p.name} is unavailable.`,
            timer: 1800,
            showConfirmButton: false,
          });
          return;
        }
        if (capped) {
          window.Swal.fire({
            toast: true,
            position: "top-end",
            icon: "info",
            title: "Quantity capped at available stock",
            showConfirmButton: false,
            timer: 2200,
          });
        }
        onCartChange?.();
      });
    });
  }

  function refresh() {
    renderChips();
    renderGrid();
  }

  searchEl.addEventListener("input", () => {
    query = searchEl.value;
    renderGrid();
  });

  store.subscribe(() => {
    refresh();
  });

  refresh();

  return { refresh };
}
