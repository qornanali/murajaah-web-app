import { type MemorizationPackage } from "./types";

export const PACKAGE_CATALOG: MemorizationPackage[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Surah Al-Fatihah",
    description: "Memorize Surah Al-Fatihah verse by verse.",
    category: "surah",
    starterVerseKey: "1:1",
    selector: { type: "surah", surahNumber: 1 },
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Last 10 Ayat of Al-Kahf",
    description: "Memorize the closing ten verses of Surah Al-Kahf.",
    category: "range",
    starterVerseKey: "18:101",
    selector: { type: "range", surahNumber: 18, startAyah: 101, endAyah: 110 },
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    title: "Juz Amma",
    description: "A focused track for Juz 30 with short surahs.",
    category: "juz",
    starterVerseKey: "78:1",
    selector: { type: "juz", juzNumber: 30 },
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    title: "Daily Salah Surahs",
    description: "Short surahs commonly recited in daily prayers.",
    category: "theme",
    starterVerseKey: "112:1",
    selector: { type: "list", verseKeys: ["112:1", "113:1", "114:1"] },
  },
];

export function getPackageBySlug(
  slug: string,
): MemorizationPackage | undefined {
  return PACKAGE_CATALOG.find((item) => item.id === slug);
}
