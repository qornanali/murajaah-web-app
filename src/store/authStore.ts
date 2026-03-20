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

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  unsubscribeFromAuth: (() => void) | null;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  unsubscribeFromAuth: null,

  initializeAuth: async () => {
    set({ isLoading: true, error: null });

    try {
      const user = await getSession();
      set({ user, isLoading: false });

      const unsubscribe = onAuthStateChanged((updatedUser) => {
        set({ user: updatedUser });
      });

      set({ unsubscribeFromAuth: unsubscribe });
    } catch (error) {
      const message = toUserError("AUTH-INIT-001", error);
      set({ error: message, isLoading: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const { user, error } = await signUp(email, password);

      if (error) {
        const message = toUserError("AUTH-SIGNUP-001", error);
        set({ error: message, isLoading: false });
        return false;
      }

      set({ user, isLoading: false });
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
      const { user, error } = await signIn(email, password);

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
      const { error } = await signOut();

      if (error) {
        const message = toUserError("AUTH-SIGNOUT-001", error);
        set({ error: message, isLoading: false });
        throw new Error(message);
      }

      set({ user: null, isLoading: false });
    } catch (error) {
      const message = toUserError("AUTH-SIGNOUT-002", error);
      set({ error: message, isLoading: false });
    }
  },
}));
