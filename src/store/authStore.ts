import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

import {
  getSession,
  onAuthStateChanged,
  signIn,
  signOut,
  signUp,
} from "@/lib/supabase/auth";
import { toUserError } from "@/lib/errorHandling";

const AUTH_TIMEOUT_MS = 12000;

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = AUTH_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Authentication request timed out"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  unsubscribeFromAuth: (() => void) | null;
}

let authInitInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  isInitialized: false,

  unsubscribeFromAuth: null,

  initializeAuth: async () => {
    if (authInitInFlight) {
      await authInitInFlight;
      return;
    }

    const existingUnsubscribe = get().unsubscribeFromAuth;
    if (existingUnsubscribe) {
      existingUnsubscribe();
      set({ unsubscribeFromAuth: null });
    }

    set({ isLoading: true, error: null });

    authInitInFlight = (async () => {
      try {
        const user = await withTimeout(getSession());
        set({ user, isLoading: false, isInitialized: true });

        const unsubscribe = onAuthStateChanged((updatedUser) => {
          set({ user: updatedUser, isLoading: false, isInitialized: true });
        });

        set({ unsubscribeFromAuth: unsubscribe });
      } catch (error) {
        const message = toUserError("AUTH-INIT-001", error);
        set({ error: message, isLoading: false, isInitialized: true });
      } finally {
        authInitInFlight = null;
      }
    })();

    await authInitInFlight;
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const { user: signedUpUser, error } = await withTimeout(
        signUp(email, password),
      );

      if (error) {
        const message = toUserError("AUTH-SIGNUP-001", error);
        set({ error: message, isLoading: false });
        return false;
      }

      if (signedUpUser) {
        const signOutResult = await withTimeout(signOut());

        if (signOutResult.error) {
          const message = toUserError("AUTH-SIGNOUT-001", signOutResult.error);
          set({ error: message, isLoading: false });
          return false;
        }
      }

      set({ user: null, isLoading: false });
      return true;
    } catch (error) {
      const message = toUserError("AUTH-SIGNUP-002", error);
      set({ error: message, isLoading: false });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const { user, error } = await withTimeout(signIn(email, password));

      if (error) {
        const message = toUserError("AUTH-SIGNIN-001", error);
        set({ error: message, isLoading: false });
        return false;
      }

      set({ user, isLoading: false });
      return true;
    } catch (error) {
      const message = toUserError("AUTH-SIGNIN-002", error);
      set({ error: message, isLoading: false });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await withTimeout(signOut());

      if (error) {
        const message = toUserError("AUTH-SIGNOUT-001", error);
        set({ error: message, isLoading: false });
        throw new Error(message);
      }

      const existingUnsubscribe = get().unsubscribeFromAuth;
      if (existingUnsubscribe) {
        existingUnsubscribe();
      }

      set({ user: null, isLoading: false, unsubscribeFromAuth: null });
    } catch (error) {
      const message = toUserError("AUTH-SIGNOUT-002", error);
      set({ error: message, isLoading: false });
    }
  },
}));
