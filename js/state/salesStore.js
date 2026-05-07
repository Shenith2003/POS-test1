import { KEYS, loadJSON, saveJSON } from "../storage.js";

export class SalesStore {
  constructor() {
    /** @type {object[]} */
    this._transactions = [];
    /** @type {Set<(tx: object[]) => void>} */
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
    let data = loadJSON(KEYS.TRANSACTIONS, null);
    if (!Array.isArray(data)) data = [];
    this._transactions = data;
  }

  getAll() {
    return structuredClone(this._transactions);
  }

  /**
   * Newest first.
   */
  getSortedDesc() {
    return [...this._transactions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  getTotalRevenue() {
    let sum = 0;
    for (const t of this._transactions) {
      sum += Number(t.grandTotal) || 0;
    }
    return Math.round(sum * 100) / 100;
  }

  append(transaction) {
    this._transactions.push(transaction);
    saveJSON(KEYS.TRANSACTIONS, this._transactions);
    this._notify();
  }
}
