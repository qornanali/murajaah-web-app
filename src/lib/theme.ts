export type AppTheme = "light" | "dark";

const DEFAULT_THEME: AppTheme = "light";
const STORAGE_KEY = "murajaah.theme";

let runtimeTheme: AppTheme = DEFAULT_THEME;

function isSupportedTheme(value: string): value is AppTheme {
  return value === "light" || value === "dark";
}

function applyTheme(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function getCurrentTheme(): AppTheme {
  if (typeof window === "undefined") {
    return runtimeTheme;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored && isSupportedTheme(stored)) {
    runtimeTheme = stored;
    applyTheme(runtimeTheme);
    return runtimeTheme;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  runtimeTheme = prefersDark ? "dark" : DEFAULT_THEME;
  applyTheme(runtimeTheme);
  return runtimeTheme;
}

export function setCurrentTheme(theme: AppTheme): void {
  runtimeTheme = theme;
  applyTheme(theme);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
}
