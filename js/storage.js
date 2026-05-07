/**
 * LocalStorage helpers with JSON + schema version for safe defaults.
 */

export const STORAGE_VERSION = 1;

export const KEYS = {
  PRODUCTS: `pos_app_products_v${STORAGE_VERSION}`,
  TRANSACTIONS: `pos_app_transactions_v${STORAGE_VERSION}`,
  SETTINGS: `pos_app_settings_v${STORAGE_VERSION}`,
};

export function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
