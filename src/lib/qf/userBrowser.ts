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

export async function deleteBookmarkForVerse(
  verseKey: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch("/api/user/bookmarks", {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        verse_key: verseKey,
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
      message: payload?.message ?? "Bookmark deletion failed",
    };
  } catch {
    return {
      ok: false,
      message: "Bookmark deletion failed",
    };
  }
}

export async function checkBookmarkStatus(
  verseKeys: string | string[],
): Promise<{
  ok: boolean;
  bookmarks?: Record<string, boolean>;
  message?: string;
}> {
  const keys = Array.isArray(verseKeys) ? verseKeys : [verseKeys];

  try {
    const response = await fetch("/api/user/bookmarks/check", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        verse_keys: keys,
      }),
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        bookmarks?: Record<string, boolean>;
      };
      return {
        ok: true,
        bookmarks: payload.bookmarks ?? {},
      };
    }

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    return {
      ok: false,
      message: payload?.message ?? "Failed to check bookmarks",
    };
  } catch {
    return {
      ok: false,
      message: "Failed to check bookmarks",
    };
  }
}
