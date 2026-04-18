"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Loader, Bookmark } from "lucide-react";

import { t } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import { useAuthStore } from "@/store/authStore";
import {
  fetchQfSessionStatus,
  type QfSessionStatus,
} from "@/lib/qf/sessionBrowser";
import { deleteBookmarkForVerse } from "@/lib/qf/userBrowser";
import { getSurahName } from "@/lib/quranMeta";

interface BookmarkItem {
  verse_key: string;
  verse_text?: string;
  surah_name?: string;
  surah_number?: number;
  ayah_number?: number;
  tags?: string[];
  created_at?: string;
}

export default function BookmarksPage() {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const user = useAuthStore((state) => state.user);
  const [qfSession, setQfSession] = useState<QfSessionStatus>({
    linked: false,
    qfUserId: null,
    appUserId: null,
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingVerseKey, setDeletingVerseKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadSession = async () => {
      try {
        const status = await fetchQfSessionStatus();
        setQfSession(status);
      } catch {
        setQfSession({ linked: false, qfUserId: null, appUserId: null });
      } finally {
        setIsCheckingAuth(false);
      }
    };
    void loadSession();
  }, []);

  const fetchBookmarks = useCallback(async () => {
    if (!user?.id && !qfSession.linked) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/bookmarks", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as {
          bookmarks?: BookmarkItem[];
        };
        setBookmarks(data.bookmarks ?? []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(
          (errorData as { message?: string }).message ??
            "Failed to load bookmarks",
        );
      }
    } catch {
      setError("Failed to load bookmarks");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, qfSession.linked]);

  useEffect(() => {
    void fetchBookmarks();
  }, [fetchBookmarks]);

  const handleDeleteBookmark = useCallback(async (verseKey: string) => {
    setDeletingVerseKey(verseKey);
    const result = await deleteBookmarkForVerse(verseKey);

    if (result.ok) {
      setBookmarks((prev) => prev.filter((b) => b.verse_key !== verseKey));
      setError(null);
    } else {
      setError(result.message ?? "Failed to delete bookmark");
    }

    setDeletingVerseKey(null);
  }, []);

  const filteredBookmarks = bookmarks.filter((b) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.verse_key.toLowerCase().includes(query) ||
      b.verse_text?.toLowerCase().includes(query) ||
      b.surah_name?.toLowerCase().includes(query)
    );
  });

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-[#FDFCF8] dark:bg-emerald-950">
        <Loader className="h-6 w-6 animate-spin text-emerald-900/40 dark:text-emerald-100/40" />
      </div>
    );
  }

  if (!user?.id && !qfSession.linked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-[#FDFCF8] dark:bg-emerald-950">
        <Bookmark className="h-8 w-8 text-emerald-900/20 dark:text-emerald-100/20" />
        <p className="text-sm text-emerald-900/60 dark:text-emerald-100/60">
          {t("bookmarks.signInRequired", locale)}
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-xl bg-emerald-900/10 px-5 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-900/15 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/15"
        >
          {t("auth.signIn", locale)}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] dark:bg-emerald-950">
      <header className="sticky top-0 z-10 border-b border-emerald-900/10 bg-[#FDFCF8]/95 backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/95">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 transition-all duration-200 hover:bg-emerald-900/10 active:scale-95 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
              {t("bookmarks.title", locale)}
            </h1>
            {bookmarks.length > 0 && (
              <p className="text-xs text-emerald-900/50 dark:text-emerald-100/50">
                {bookmarks.length} {bookmarks.length === 1 ? "ayah" : "ayahs"}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
        {bookmarks.length > 0 && (
          <div className="mb-5">
            <input
              type="text"
              placeholder={t("bookmarks.search", locale)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-emerald-900/15 bg-emerald-900/5 px-4 py-2.5 text-sm text-emerald-900 placeholder-emerald-900/40 outline-none focus:border-emerald-900/30 focus:ring-0 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:placeholder-emerald-100/40"
            />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader className="h-5 w-5 animate-spin text-emerald-900/40 dark:text-emerald-100/40" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/40">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void fetchBookmarks()}
              className="mt-2 text-xs font-medium text-red-800 underline hover:no-underline dark:text-red-200"
            >
              {t("common.retry", locale)}
            </button>
          </div>
        )}

        {!isLoading && !error && filteredBookmarks.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Bookmark className="h-8 w-8 text-emerald-900/20 dark:text-emerald-100/20" />
            <p className="text-sm text-emerald-900/50 dark:text-emerald-100/50">
              {searchQuery
                ? t("bookmarks.noResults", locale)
                : t("bookmarks.empty", locale)}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filteredBookmarks.map((bookmark) => {
            const [surahStr, ayahStr] = bookmark.verse_key.split(":");
            const surahNum = Number(surahStr);
            const ayahNum = Number(ayahStr);
            const surahName = getSurahName(surahNum);

            return (
              <div
                key={bookmark.verse_key}
                className="group flex items-center gap-3 rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 transition-colors hover:border-emerald-900/20 dark:border-emerald-100/10 dark:bg-emerald-900/10 dark:hover:border-emerald-100/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  <Bookmark className="h-4 w-4 fill-current" />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/practice/ayah/${bookmark.verse_key}`)
                  }
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                    {surahName}
                  </p>
                  <p className="text-xs text-emerald-900/50 dark:text-emerald-100/50">
                    {t("quran.surah", locale)} {surahNum} ·{" "}
                    {t("quran.ayah", locale)} {ayahNum}
                  </p>
                </button>
                {bookmark.created_at && (
                  <p className="hidden shrink-0 text-xs text-emerald-900/40 dark:text-emerald-100/40 sm:block">
                    {new Date(bookmark.created_at).toLocaleDateString(
                      locale === "id" ? "id-ID" : "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleDeleteBookmark(bookmark.verse_key)}
                  disabled={deletingVerseKey === bookmark.verse_key}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-emerald-900/30 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-emerald-100/30 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  {deletingVerseKey === bookmark.verse_key ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
