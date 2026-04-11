export async function fetchUserSurahTracks(userId: string): Promise<number[]> {
  const _ = userId;
  void _;

  const response = await fetch("/api/user/surah-tracks", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? "Unable to load surah tracks");
  }

  const payload = (await response.json()) as { tracks?: number[] };
  return Array.isArray(payload.tracks) ? payload.tracks : [];
}

export async function addUserSurahTrack(
  userId: string,
  surahNumber: number,
): Promise<void> {
  const _ = userId;
  void _;

  const response = await fetch("/api/user/surah-tracks", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ surahNumber }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? "Unable to save surah track");
  }
}

export async function removeUserSurahTrack(
  userId: string,
  surahNumber: number,
): Promise<void> {
  const _ = userId;
  void _;

  const response = await fetch("/api/user/surah-tracks", {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ surahNumber }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? "Unable to remove surah track");
  }
}
