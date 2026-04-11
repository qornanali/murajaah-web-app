export async function checkUserApiConnectivity(): Promise<boolean> {
  try {
    const response = await fetch("/api/user/oauth/status", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json().catch(() => null)) as {
      linked?: boolean;
    } | null;

    return payload?.linked === true;
  } catch {
    return false;
  }
}

export async function createBookmarkForVerse(
  verseKey: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch("/api/user/bookmarks", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        verse_key: verseKey,
        verseKey,
      }),
    });

    if (response.ok) {
      return { ok: true };
    }

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    return {
      ok: false,
      message: payload?.message ?? "Bookmark request failed",
    };
  } catch {
    return {
      ok: false,
      message: "Bookmark request failed",
    };
  }
}
