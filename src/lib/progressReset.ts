import { murajaahDB } from "@/lib/offline/db";
import { isGuestUserId } from "@/lib/guest";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function resetProgressForVerseKeys(
  userId: string,
  verseKeys: Set<string>,
): Promise<void> {
  if (verseKeys.size === 0) {
    return;
  }

  const verseKeyList = Array.from(verseKeys);

  const targetIds: string[] = [];

  await Promise.all(
    verseKeyList.map(async (verseKey) => {
      const [surahRaw, ayahRaw] = verseKey.split(":");
      const surahNumber = Number.parseInt(surahRaw ?? "", 10);
      const ayahNumber = Number.parseInt(ayahRaw ?? "", 10);

      if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber)) {
        return;
      }

      const row = await murajaahDB.ayahProgress
        .where("[userId+surahNumber+ayahNumber]")
        .equals([userId, surahNumber, ayahNumber])
        .first();

      if (row) {
        targetIds.push(row.id);
      }
    }),
  );

  if (targetIds.length === 0) {
    return;
  }

  await murajaahDB.ayahProgress.bulkDelete(targetIds);

  await murajaahDB.syncQueue
    .where("entityId")
    .anyOf(targetIds)
    .delete();

  if (isGuestUserId(userId)) {
    return;
  }

  const surahGroups: Record<number, number[]> = {};

  verseKeyList.forEach((verseKey) => {
    const [surahRaw, ayahRaw] = verseKey.split(":");
    const surahNumber = Number.parseInt(surahRaw ?? "", 10);
    const ayahNumber = Number.parseInt(ayahRaw ?? "", 10);

    if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber)) {
      return;
    }

    if (!surahGroups[surahNumber]) {
      surahGroups[surahNumber] = [];
    }

    surahGroups[surahNumber].push(ayahNumber);
  });

  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  await Promise.all(
    Object.entries(surahGroups).map(async ([surahStr, ayahNumbers]) => {
      const surahNumber = Number.parseInt(surahStr, 10);

      await supabase
        .from("ayah_progress")
        .delete()
        .eq("user_id", userId)
        .eq("surah_number", surahNumber)
        .in("ayah_number", ayahNumbers);
    }),
  );
}
