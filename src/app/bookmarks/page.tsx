"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Loader } from "lucide-react";

import { t } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import { useAuthStore } from "@/store/authStore";
import {
  fetchQfSessionStatus,
  type QfSessionStatus,
} from "@/lib/qf/sessionBrowser";
import { deleteBookmarkForVerse } from "@/lib/qf/userBrowser";

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
  const [qfSession, setQfSession] = useState<QfSessionStatus | null>(null);
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
        setQfSession(null);
      }
    };
    void loadSession();
  }, []);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user?.id && !qfSession?.linked) {
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
    };

    void fetchBookmarks();
  }, [user?.id, qfSession?.linked]);

  const handleDeleteBookmark = useCallback(async (verseKey: string) => {
    setDeletingVerseKey(verseKey);
    const result = await deleteBookmarkForVerse(verseKey);

    if (result.ok) {
      setBookmarks((prev) => prev.filter((b) => b.verse_key !== verseKey));
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

  if (!user?.id && !qfSession?.linked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <p className="mb-4 text-lg text-gray-700 dark:text-gray-300">
            {t("bookmarks.signInRequired", locale)}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"
          >
            {t("auth.signIn", locale)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-4xl items-center gap-4 p-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">{t("bookmarks.title", locale)}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4">
        {bookmarks.length > 0 && (
          <div className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder={t("bookmarks.search", locale)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredBookmarks.length} / {bookmarks.length}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {!isLoading && !error && filteredBookmarks.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery
                ? t("bookmarks.noResults", locale)
                : t("bookmarks.empty", locale)}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.verse_key}
              className="group flex items-start gap-4 rounded-lg border border-gray-200 p-4 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {bookmark.surah_name} {bookmark.surah_number}:
                  {bookmark.ayah_number}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
                  {bookmark.verse_text}
                </p>
                {bookmark.created_at && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {new Date(bookmark.created_at).toLocaleDateString(locale)}
                  </p>
                )}
              </div>
              <button
                onClick={() => void handleDeleteBookmark(bookmark.verse_key)}
                disabled={deletingVerseKey === bookmark.verse_key}
                className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
              >
                {deletingVerseKey === bookmark.verse_key ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
