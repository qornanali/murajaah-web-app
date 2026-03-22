import { toVerseKey } from "@/lib/quranApi";

import type { MemorizationPackage } from "./types";

const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 5, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;

const SUPPORTED_JUZ_RANGES: Record<
  number,
  { startSurah: number; startAyah: number; endSurah: number; endAyah: number }
> = {
  1: { startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 141 },
  2: { startSurah: 2, startAyah: 142, endSurah: 2, endAyah: 252 },
  3: { startSurah: 2, startAyah: 253, endSurah: 3, endAyah: 92 },
  4: { startSurah: 3, startAyah: 93, endSurah: 4, endAyah: 23 },
  5: { startSurah: 4, startAyah: 24, endSurah: 4, endAyah: 147 },
  6: { startSurah: 4, startAyah: 148, endSurah: 5, endAyah: 81 },
  7: { startSurah: 5, startAyah: 82, endSurah: 6, endAyah: 110 },
  8: { startSurah: 6, startAyah: 111, endSurah: 7, endAyah: 87 },
  9: { startSurah: 7, startAyah: 88, endSurah: 8, endAyah: 40 },
  10: { startSurah: 8, startAyah: 41, endSurah: 9, endAyah: 92 },
  11: { startSurah: 9, startAyah: 93, endSurah: 11, endAyah: 5 },
  12: { startSurah: 11, startAyah: 6, endSurah: 12, endAyah: 52 },
  13: { startSurah: 12, startAyah: 53, endSurah: 14, endAyah: 52 },
  14: { startSurah: 15, startAyah: 1, endSurah: 16, endAyah: 128 },
  15: { startSurah: 17, startAyah: 1, endSurah: 18, endAyah: 74 },
  16: { startSurah: 18, startAyah: 75, endSurah: 20, endAyah: 135 },
  17: { startSurah: 21, startAyah: 1, endSurah: 22, endAyah: 78 },
  18: { startSurah: 23, startAyah: 1, endSurah: 25, endAyah: 20 },
  19: { startSurah: 25, startAyah: 21, endSurah: 27, endAyah: 55 },
  20: { startSurah: 27, startAyah: 56, endSurah: 29, endAyah: 45 },
  21: { startSurah: 29, startAyah: 46, endSurah: 33, endAyah: 30 },
  22: { startSurah: 33, startAyah: 31, endSurah: 36, endAyah: 27 },
  23: { startSurah: 36, startAyah: 28, endSurah: 39, endAyah: 31 },
  24: { startSurah: 39, startAyah: 32, endSurah: 41, endAyah: 46 },
  25: { startSurah: 41, startAyah: 47, endSurah: 45, endAyah: 37 },
  26: { startSurah: 46, startAyah: 1, endSurah: 51, endAyah: 30 },
  27: { startSurah: 51, startAyah: 31, endSurah: 57, endAyah: 29 },
  28: { startSurah: 58, startAyah: 1, endSurah: 66, endAyah: 12 },
  29: { startSurah: 67, startAyah: 1, endSurah: 77, endAyah: 50 },
  30: { startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6 },
};

export interface PackageProgressSnapshot {
  totalVerses: number;
  reviewedVerses: number;
  progressPercent: number;
}

function getSurahAyahCount(surahNumber: number): number {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return 0;
  }

  return SURAH_AYAH_COUNTS[surahNumber - 1] ?? 0;
}

function normalizeVerseKey(verseKey: string): string | null {
  const [surahRaw, ayahRaw] = verseKey.split(":");
  const surahNumber = Number.parseInt(surahRaw ?? "", 10);
  const ayahNumber = Number.parseInt(ayahRaw ?? "", 10);

  if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber)) {
    return null;
  }

  const maxAyah = getSurahAyahCount(surahNumber);

  if (maxAyah === 0 || ayahNumber < 1 || ayahNumber > maxAyah) {
    return null;
  }

  return toVerseKey(surahNumber, ayahNumber);
}

function addSurahVerses(target: Set<string>, surahNumber: number): void {
  const maxAyah = getSurahAyahCount(surahNumber);

  for (let ayahNumber = 1; ayahNumber <= maxAyah; ayahNumber += 1) {
    target.add(toVerseKey(surahNumber, ayahNumber));
  }
}

function addRangeVerses(
  target: Set<string>,
  startSurah: number,
  startAyah: number,
  endSurah: number,
  endAyah: number,
): void {
  for (
    let surahNumber = startSurah;
    surahNumber <= endSurah;
    surahNumber += 1
  ) {
    const maxAyah = getSurahAyahCount(surahNumber);

    if (maxAyah === 0) {
      continue;
    }

    const fromAyah = surahNumber === startSurah ? startAyah : 1;
    const untilAyah = surahNumber === endSurah ? endAyah : maxAyah;

    for (let ayahNumber = fromAyah; ayahNumber <= untilAyah; ayahNumber += 1) {
      if (ayahNumber >= 1 && ayahNumber <= maxAyah) {
        target.add(toVerseKey(surahNumber, ayahNumber));
      }
    }
  }
}

export function getPackageVerseKeys(pkg: MemorizationPackage): Set<string> {
  const verseKeys = new Set<string>();
  const selector = pkg.selector;

  if (selector.type === "surah") {
    addSurahVerses(verseKeys, selector.surahNumber);
    return verseKeys;
  }

  if (selector.type === "range") {
    addRangeVerses(
      verseKeys,
      selector.surahNumber,
      selector.startAyah,
      selector.surahNumber,
      selector.endAyah,
    );
    return verseKeys;
  }

  if (selector.type === "list") {
    selector.verseKeys.forEach((verseKey) => {
      const normalized = normalizeVerseKey(verseKey);

      if (normalized) {
        verseKeys.add(normalized);
      }
    });

    return verseKeys;
  }

  if (selector.type === "juz") {
    const range = SUPPORTED_JUZ_RANGES[selector.juzNumber];

    if (!range) {
      return verseKeys;
    }

    addRangeVerses(
      verseKeys,
      range.startSurah,
      range.startAyah,
      range.endSurah,
      range.endAyah,
    );
  }

  return verseKeys;
}

export function getPackageProgressSnapshot(
  pkg: MemorizationPackage,
  reviewedVerseKeys: Set<string>,
): PackageProgressSnapshot {
  const packageVerseKeys = getPackageVerseKeys(pkg);
  const totalVerses = packageVerseKeys.size;

  if (totalVerses === 0) {
    return {
      totalVerses: 0,
      reviewedVerses: 0,
      progressPercent: 0,
    };
  }

  let reviewedVerses = 0;

  packageVerseKeys.forEach((verseKey) => {
    if (reviewedVerseKeys.has(verseKey)) {
      reviewedVerses += 1;
    }
  });

  return {
    totalVerses,
    reviewedVerses,
    progressPercent: Math.round((reviewedVerses / totalVerses) * 100),
  };
}
