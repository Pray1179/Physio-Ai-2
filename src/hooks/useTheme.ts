import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "physioai_theme";
type Theme = "light" | "dark";

function getSystemPreference(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readSaved(): Theme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch { /* ignore */ }
  return null;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Sync the <html> class on mount so dark mode applies before first paint.
 * Call once at the top of App (the root component).
 */
export function useThemeInit() {
  const saved = readSaved();
  const theme = saved ?? getSystemPreference();
  applyTheme(theme);

  // Watch OS changes when no explicit preference is saved
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    if (!readSaved()) applyTheme(e.matches ? "dark" : "light");
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/**
 * Interactive theme state + toggle. Use in UI components (UserMenu, etc.).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return readSaved() ?? getSystemPreference();
  });

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  // Sync if another tab / component changes the value
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = (e.newValue as Theme) ?? getSystemPreference();
      setThemeState(next);
      applyTheme(next);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { theme, toggle };
}
