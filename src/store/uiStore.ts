import { create } from "zustand";

const ONBOARDING_MODAL_SEEN_KEY = "murajaah.onboarding.seen";

interface UIState {
  hasSeenOnboardingModal: boolean;
  initializeUIState: () => void;
  dismissOnboardingModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  hasSeenOnboardingModal: false,

  initializeUIState: () => {
    const hasSeen =
      typeof window !== "undefined"
        ? localStorage.getItem(ONBOARDING_MODAL_SEEN_KEY) === "true"
        : false;
    set({ hasSeenOnboardingModal: hasSeen });
  },

  dismissOnboardingModal: () => {
    localStorage.setItem(ONBOARDING_MODAL_SEEN_KEY, "true");
    set({ hasSeenOnboardingModal: true });
  },
}));
