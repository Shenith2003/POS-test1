import { KEYS, loadJSON, saveJSON } from "./storage.js";
import { DEFAULT_SETTINGS } from "./data/seed.js";

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...loadJSON(KEYS.SETTINGS, {}) };
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  saveJSON(KEYS.SETTINGS, next);
  return next;
}

/** Consume current receipt number and persist increment. */
export function takeNextReceiptNo() {
  const s = loadSettings();
  const no = Number(s.nextReceiptNo);
  const current = Number.isFinite(no) ? no : DEFAULT_SETTINGS.nextReceiptNo;
  saveSettings({ nextReceiptNo: current + 1 });
  return current;
}
