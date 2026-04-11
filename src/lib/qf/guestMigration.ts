import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

interface GuestProgressRow {
  id: string;
  surah_number: number;
  ayah_number: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  updated_at: string;
}

interface GuestSurahTrackRow {
  id: string;
  surah_number: number;
  created_at: string;
}

interface GuestPackageEnrollmentRow {
  id: string;
  package_id: string;
  status: string;
  daily_new_target: number;
  created_at: string;
}

export async function migrateGuestProgressToUser(
  guestUserId: string,
  newAppUserId: string,
): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();

    const { data: guestProgress, error: fetchError } = await supabase
      .from("ayah_progress")
      .select("*")
      .eq("user_id", guestUserId);

    if (fetchError) {
      console.error("Failed to fetch guest progress:", fetchError);
      return 0;
    }

    if (!guestProgress || guestProgress.length === 0) {
      return 0;
    }

    const newRows = guestProgress.map((row: GuestProgressRow) => ({
      id: row.id,
      user_id: newAppUserId,
      surah_number: row.surah_number,
      ayah_number: row.ayah_number,
      ease_factor: row.ease_factor,
      interval: row.interval,
      repetitions: row.repetitions,
      next_review_date: row.next_review_date,
      updated_at: row.updated_at,
    }));

    const { error: insertError } = await supabase
      .from("ayah_progress")
      .insert(newRows, { count: "exact" });

    if (insertError) {
      console.error("Failed to insert guest progress for user:", insertError);
      return 0;
    }

    return guestProgress.length;
  } catch (error) {
    console.error("Error during guest progress migration:", error);
    return 0;
  }
}

export async function migrateGuestSurahTracksToUser(
  guestUserId: string,
  newAppUserId: string,
): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();

    const { data: guestTracks, error: fetchError } = await supabase
      .from("user_surah_tracks")
      .select("*")
      .eq("user_id", guestUserId);

    if (fetchError) {
      console.error("Failed to fetch guest surah tracks:", fetchError);
      return 0;
    }

    if (!guestTracks || guestTracks.length === 0) {
      return 0;
    }

    const newRows = guestTracks.map((row: GuestSurahTrackRow) => ({
      id: row.id,
      user_id: newAppUserId,
      surah_number: row.surah_number,
      created_at: row.created_at,
    }));

    const { error: insertError } = await supabase
      .from("user_surah_tracks")
      .insert(newRows, { count: "exact" });

    if (insertError) {
      console.error(
        "Failed to insert guest surah tracks for user:",
        insertError,
      );
      return 0;
    }

    return guestTracks.length;
  } catch (error) {
    console.error("Error during guest surah tracks migration:", error);
    return 0;
  }
}

export async function migrateGuestPackageEnrollmentsToUser(
  guestUserId: string,
  newAppUserId: string,
): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();

    const { data: guestEnrollments, error: fetchError } = await supabase
      .from("user_memorization_packages")
      .select("*")
      .eq("user_id", guestUserId);

    if (fetchError) {
      console.error("Failed to fetch guest package enrollments:", fetchError);
      return 0;
    }

    if (!guestEnrollments || guestEnrollments.length === 0) {
      return 0;
    }

    const newRows = guestEnrollments.map((row: GuestPackageEnrollmentRow) => ({
      id: row.id,
      user_id: newAppUserId,
      package_id: row.package_id,
      status: row.status,
      daily_new_target: row.daily_new_target,
      created_at: row.created_at,
    }));

    const { error: insertError } = await supabase
      .from("user_memorization_packages")
      .insert(newRows, { count: "exact" });

    if (insertError) {
      console.error(
        "Failed to insert guest package enrollments for user:",
        insertError,
      );
      return 0;
    }

    return guestEnrollments.length;
  } catch (error) {
    console.error("Error during guest package enrollments migration:", error);
    return 0;
  }
}

export async function migrateAllGuestDataToUser(
  guestUserId: string,
  newAppUserId: string,
): Promise<{ progress: number; tracks: number; enrollments: number }> {
  const [progress, tracks, enrollments] = await Promise.all([
    migrateGuestProgressToUser(guestUserId, newAppUserId),
    migrateGuestSurahTracksToUser(guestUserId, newAppUserId),
    migrateGuestPackageEnrollmentsToUser(guestUserId, newAppUserId),
  ]);

  return { progress, tracks, enrollments };
}
