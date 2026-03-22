export interface QuranApiAyah {
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  textUthmani: string;
  audioUrl: string | null;
}

interface VerseResponse {
  verse?: {
    id?: number;
    verse_key?: string;
    text_uthmani?: string;
    audio?: {
      url?: string;
    };
  };
}

const QURAN_PROXY_BASE = "/api/quran";
const LAST_SURAH_NUMBER = 114;

export function toVerseKey(surahNumber: number, ayahNumber: number): string {
  return `${surahNumber}:${ayahNumber}`;
}

function parseVerseKey(verseKey: string): {
  surahNumber: number;
  ayahNumber: number;
} {
  const [surahRaw, ayahRaw] = verseKey.split(":");
  const surahNumber = Number.parseInt(surahRaw ?? "", 10);
  const ayahNumber = Number.parseInt(ayahRaw ?? "", 10);

  if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber)) {
    throw new Error("Invalid verse key format. Expected SURAH:AYAH.");
  }

  return { surahNumber, ayahNumber };
}

function normalizeAudioUrl(url?: string): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith("http")) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return `https://audio.qurancdn.com/${url.replace(/^\//, "")}`;
}

export async function fetchAyahByKey(
  verseKey: string,
  recitationId = 7,
): Promise<QuranApiAyah> {
  const encodedKey = encodeURIComponent(verseKey);
  const endpoint = `${QURAN_PROXY_BASE}/verses/by_key/${encodedKey}?fields=text_uthmani&audio=${recitationId}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Quran API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as VerseResponse;

  if (!payload.verse?.text_uthmani || !payload.verse.verse_key) {
    throw new Error("Quran API returned incomplete verse data");
  }

  const { surahNumber, ayahNumber } = parseVerseKey(payload.verse.verse_key);

  return {
    surahNumber,
    ayahNumber,
    verseKey: payload.verse.verse_key,
    textUthmani: payload.verse.text_uthmani,
    audioUrl: normalizeAudioUrl(payload.verse.audio?.url),
  };
}

export async function fetchNextAyah(
  currentSurahNumber: number,
  currentAyahNumber: number,
  recitationId = 7,
): Promise<QuranApiAyah> {
  let surahNumber = currentSurahNumber;
  let ayahNumber = currentAyahNumber + 1;

  for (let attempt = 0; attempt < LAST_SURAH_NUMBER; attempt += 1) {
    try {
      return await fetchAyahByKey(
        toVerseKey(surahNumber, ayahNumber),
        recitationId,
      );
    } catch {
      surahNumber += 1;
      ayahNumber = 1;

      if (surahNumber > LAST_SURAH_NUMBER) {
        break;
      }
    }
  }

  return fetchAyahByKey(toVerseKey(1, 1), recitationId);
}
