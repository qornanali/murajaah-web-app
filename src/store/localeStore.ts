import { create } from "zustand";

import { getCurrentLocale, setCurrentLocale, type AppLocale } from "@/lib/i18n";

interface LocaleState {
  locale: AppLocale;
  initialized: boolean;
  initializeLocale: () => void;
  setLocale: (locale: AppLocale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "en",
  initialized: false,

  initializeLocale: () => {
    const locale = getCurrentLocale();
    setCurrentLocale(locale);
    set({ locale, initialized: true });
  },

  setLocale: (locale) => {
    setCurrentLocale(locale);
    set({ locale });
  },
}));
