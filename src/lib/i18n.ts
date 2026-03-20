import translations from "@/config/translations.json";

export type AppLocale = "en" | "id";

const DEFAULT_LOCALE: AppLocale = "en";
const STORAGE_KEY = "murajaah.locale";

let runtimeLocale: AppLocale = DEFAULT_LOCALE;

function isSupportedLocale(value: string): value is AppLocale {
  return value === "en" || value === "id";
}

export function getCurrentLocale(): AppLocale {
  if (typeof window === "undefined") {
    return runtimeLocale;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored && isSupportedLocale(stored)) {
    runtimeLocale = stored;
    return runtimeLocale;
  }

  const browserLang = window.navigator.language.toLowerCase();
  runtimeLocale = browserLang.startsWith("id") ? "id" : DEFAULT_LOCALE;
  return runtimeLocale;
}

export function setCurrentLocale(locale: AppLocale): void {
  runtimeLocale = locale;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }
}

export function t(key: string, locale: AppLocale = getCurrentLocale()): string {
  const selected = translations[locale] as Record<string, string>;
  const fallback = translations[DEFAULT_LOCALE] as Record<string, string>;

  return selected[key] ?? fallback[key] ?? key;
}
