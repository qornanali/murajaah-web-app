import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function fetchUserSurahTracks(userId: string): Promise<number[]> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase credentials are missing");
  }

  const { data, error } = await supabase
    .from("user_surah_tracks")
    .select("surah_number")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: { surah_number: number }) => row.surah_number);
}

export async function addUserSurahTrack(
  userId: string,
  surahNumber: number,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase credentials are missing");
  }

  const { error } = await supabase
    .from("user_surah_tracks")
    .upsert(
      { user_id: userId, surah_number: surahNumber },
      { onConflict: "user_id,surah_number", ignoreDuplicates: true },
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeUserSurahTrack(
  userId: string,
  surahNumber: number,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase credentials are missing");
  }

  const { error } = await supabase
    .from("user_surah_tracks")
    .delete()
    .eq("user_id", userId)
    .eq("surah_number", surahNumber);

  if (error) {
    throw new Error(error.message);
  }
}
