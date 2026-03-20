import { create } from "zustand";

import { getCurrentTheme, setCurrentTheme, type AppTheme } from "@/lib/theme";

interface ThemeState {
  theme: AppTheme;
  initialized: boolean;
  initializeTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  initialized: false,

  initializeTheme: () => {
    const theme = getCurrentTheme();
    setCurrentTheme(theme);
    set({ theme, initialized: true });
  },

  setTheme: (theme) => {
    setCurrentTheme(theme);
    set({ theme });
  },
}));
