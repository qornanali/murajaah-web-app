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

export async function fetchLinkedUserProfile(): Promise<{
  ok: boolean;
  displayName?: string;
  qfUserId?: string;
  message?: string;
}> {
  try {
    const response = await fetch("/api/user/profile", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        displayName?: string;
        qfUserId?: string;
      } | null;

      return {
        ok: true,
        displayName: payload?.displayName,
        qfUserId: payload?.qfUserId,
      };
    }

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    return {
      ok: false,
      message: payload?.message ?? "Failed to fetch linked profile",
    };
  } catch {
    return {
      ok: false,
      message: "Failed to fetch linked profile",
    };
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

export async function fetchUserBookmarks(first = 100): Promise<{
  ok: boolean;
  bookmarks?: Array<{
    id: string;
    verse_key: string;
    created_at: string;
    resource?: { text?: string };
  }>;
  pagination?: { total: number; limit: number; offset: number };
  message?: string;
}> {
  try {
    const params = new URLSearchParams();
    params.set("first", Math.min(first, 20).toString());

    const response = await fetch(`/api/user/bookmarks?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        bookmarks?: Array<{
          id: string;
          verse_key: string;
          created_at: string;
          resource?: { text?: string };
        }>;
        pagination?: { total: number; limit: number; offset: number };
      };

      return {
        ok: true,
        bookmarks: payload.bookmarks ?? [],
        pagination: payload.pagination,
      };
    }

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    return {
      ok: false,
      message: payload?.message ?? "Failed to fetch bookmarks",
    };
  } catch {
    return {
      ok: false,
      message: "Failed to fetch bookmarks",
    };
  }
}
