import { loadSettings, saveSettings } from "../settings.js";

export function initTheme(toggleButton) {
  const s = loadSettings();
  applyThemeClass(s.theme === "dark" ? "dark" : "light");

  toggleButton?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    const theme = isDark ? "dark" : "light";
    saveSettings({ theme });
    applyThemeClass(theme);
  });
}

function applyThemeClass(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
