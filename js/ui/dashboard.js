import { normalizeProduct, roundMoney } from "../domain/product.js";

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

/** Persists across re-renders while editing */
let _editingId = null;

/**
 * @param {HTMLElement} root
 * @param {import('../state/inventoryStore.js').InventoryStore} store
 */
export function renderDashboard(root, store) {
  const products = store.getAll();
  const idSet = new Set(products.map((p) => p.id));

  const tableRows = products
    .map((p, index) => {
      const low = p.stockQty <= 5 && p.stockQty > 0;
      const stockCell =
        p.stockQty === 0
          ? `<span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-200">Out of Stock</span>`
          : low
            ? `<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">${p.stockQty} (low)</span>`
            : String(p.stockQty);

      return `
      <tr class="border-b border-slate-100 dark:border-slate-800" data-id="${esc(p.id)}">
        <td class="px-3 py-3 font-mono text-xs">${esc(p.id)}</td>
        <td class="px-3 py-3 font-medium">${esc(p.name)}</td>
        <td class="px-3 py-3 text-slate-600 dark:text-slate-300">${esc(p.category)}</td>
        <td class="px-3 py-3 text-right">$${roundMoney(p.costPrice).toFixed(2)}</td>
        <td class="px-3 py-3 text-right font-medium">$${roundMoney(p.sellingPrice).toFixed(2)}</td>
        <td class="px-3 py-3 text-right">${stockCell}</td>
        <td class="px-3 py-3 text-right">
          <button type="button" class="btn-edit mb-1 min-h-10 rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:mb-0 sm:mr-1" data-index="${index}">Edit</button>
          <button type="button" class="btn-del min-h-10 rounded-lg bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900" data-id="${esc(p.id)}">Delete</button>
        </td>
      </tr>`;
    })
    .join("");

  root.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <h2 class="text-lg font-semibold">Inventory</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Add, edit, or remove products. ID doubles as barcode/SKU.</p>
      </div>
      <div class="overflow-x-auto p-4">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th class="px-3 py-2">ID</th>
              <th class="px-3 py-2">Name</th>
              <th class="px-3 py-2">Category</th>
              <th class="px-3 py-2 text-right">Cost</th>
              <th class="px-3 py-2 text-right">Sell</th>
              <th class="px-3 py-2 text-right">Stock</th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>${tableRows || `<tr><td colspan="7" class="px-3 py-8 text-center text-slate-500">No products yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 class="mb-4 text-base font-semibold" id="form-title">${_editingId ? "Edit product" : "Add product"}</h3>
      <form id="product-form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" for="pf-id">ID / Barcode</label>
          <input id="pf-id" name="id" required class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-950" ${_editingId ? "readonly" : ""} />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" for="pf-name">Name</label>
          <input id="pf-name" name="name" required class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" for="pf-cat">Category</label>
          <input id="pf-cat" name="category" required list="category-list" class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
          <datalist id="category-list">
            ${store
              .getCategories()
              .map((c) => `<option value="${esc(c)}">`)
              .join("")}
          </datalist>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" for="pf-cost">Cost price</label>
          <input id="pf-cost" name="costPrice" type="number" step="0.01" min="0" required class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" for="pf-sell">Selling price</label>
          <input id="pf-sell" name="sellingPrice" type="number" step="0.01" min="0" required class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" for="pf-stock">Stock quantity</label>
          <input id="pf-stock" name="stockQty" type="number" step="1" min="0" required class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <div class="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" class="min-h-12 min-w-[140px] rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-sm hover:bg-indigo-500">Save</button>
          <button type="button" id="pf-cancel" class="min-h-12 rounded-xl border border-slate-200 bg-white px-5 font-medium dark:border-slate-700 dark:bg-slate-800 ${_editingId ? "" : "hidden"}">Cancel edit</button>
        </div>
      </form>
    </div>
  `;

  const form = root.querySelector("#product-form");
  const cancelBtn = root.querySelector("#pf-cancel");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const raw = Object.fromEntries(fd.entries());
    const ignoreId = _editingId || null;
    const res = normalizeProduct(raw, idSet, ignoreId);
    if (!res.ok) {
      window.Swal.fire({ icon: "error", title: "Validation", html: res.errors.join("<br/>") });
      return;
    }
    if (_editingId) {
      const idx = store.findIndexById(_editingId);
      if (idx === -1) return;
      store.update(idx, res.product);
      window.Swal.fire({ icon: "success", title: "Updated", timer: 1400, showConfirmButton: false });
    } else {
      store.add(res.product);
      idSet.add(res.product.id);
      window.Swal.fire({ icon: "success", title: "Product added", timer: 1400, showConfirmButton: false });
    }
    _editingId = null;
    renderDashboard(root, store);
  });

  cancelBtn?.addEventListener("click", () => {
    _editingId = null;
    renderDashboard(root, store);
  });

  root.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-index"));
      const p = products[idx];
      if (!p) return;
      _editingId = p.id;
      renderDashboard(root, store);
    });
  });

  root.querySelectorAll(".btn-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const p = store.getById(id);
      if (!p) return;
      const r = await window.Swal.fire({
        icon: "warning",
        title: "Delete product?",
        text: `${p.name} (${p.id})`,
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#be123c",
      });
      if (!r.isConfirmed) return;
      store.deleteById(id);
      if (_editingId === id) _editingId = null;
      window.Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      renderDashboard(root, store);
    });
  });

  if (_editingId) {
    const p = store.getById(_editingId);
    if (p) {
      root.querySelector("#pf-id").value = p.id;
      root.querySelector("#pf-name").value = p.name;
      root.querySelector("#pf-cat").value = p.category;
      root.querySelector("#pf-cost").value = String(p.costPrice);
      root.querySelector("#pf-sell").value = String(p.sellingPrice);
      root.querySelector("#pf-stock").value = String(p.stockQty);
      root.querySelector("#pf-id").setAttribute("readonly", "");
      root.querySelector("#form-title").textContent = "Edit product";
      root.querySelector("#pf-cancel")?.classList.remove("hidden");
    } else {
      _editingId = null;
    }
  }
}
