import { KEYS, loadJSON, saveJSON } from "../storage.js";
import { SEED_PRODUCTS } from "../data/seed.js";

export class InventoryStore {
  constructor() {
    /** @type {object[]} */
    this._products = [];
    /** @type {Set<(products: object[]) => void>} */
    this._listeners = new Set();
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    const snapshot = this.getAll();
    for (const fn of this._listeners) fn(snapshot);
  }

  ensureLoaded() {
    let data = loadJSON(KEYS.PRODUCTS, null);
    if (!Array.isArray(data) || data.length === 0) {
      data = structuredClone(SEED_PRODUCTS);
      saveJSON(KEYS.PRODUCTS, data);
    }
    this._products = data;
  }

  getAll() {
    return structuredClone(this._products);
  }

  getById(id) {
    return this._products.find((p) => p.id === id) ?? null;
  }

  _persist() {
    saveJSON(KEYS.PRODUCTS, this._products);
    this._notify();
  }

  /**
   * Replace entire list (used after atomic sale).
   */
  _setProducts(products) {
    this._products = products;
    this._persist();
  }

  add(product) {
    this._products.push(product);
    this._persist();
  }

  update(index, product) {
    if (index < 0 || index >= this._products.length) return false;
    this._products[index] = product;
    this._persist();
    return true;
  }

  findIndexById(id) {
    return this._products.findIndex((p) => p.id === id);
  }

  deleteById(id) {
    const i = this.findIndexById(id);
    if (i === -1) return false;
    this._products.splice(i, 1);
    this._persist();
    return true;
  }

  /**
   * Apply stock deductions in one pass; returns false if any line invalid.
   * @param {{ productId: string, qty: number }[]} deductions
   */
  applyStockDeductions(deductions) {
    const next = structuredClone(this._products);
    const byId = new Map(next.map((p, i) => [p.id, i]));

    for (const { productId, qty } of deductions) {
      const i = byId.get(productId);
      if (i === undefined) return { ok: false, reason: `Unknown product ${productId}` };
      if (next[i].stockQty < qty)
        return {
          ok: false,
          reason: `Insufficient stock for ${next[i].name}`,
          productId,
        };
      next[i].stockQty -= qty;
    }

    this._products = next;
    this._persist();
    return { ok: true };
  }

  getCategories() {
    const s = new Set();
    for (const p of this._products) {
      if (p.category) s.add(p.category);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }
}
