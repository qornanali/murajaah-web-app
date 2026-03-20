import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export async function signUp(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { user: null, error: "Supabase not configured" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { user: null, error: "Supabase not configured" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signOut(): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { error: "Supabase not configured" };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function getSession(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    callback(null);
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
