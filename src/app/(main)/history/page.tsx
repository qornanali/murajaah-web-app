"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, BookOpen, Loader2 } from "lucide-react";

import { t } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useReviewStore } from "@/store/reviewStore";
import { getGuestUserId } from "@/lib/guest";
import { toVerseKey } from "@/lib/quranApi";
import { murajaahDB } from "@/lib/offline/db";
import { calculateStreakFromIsoDates } from "@/lib/streak";
import {
  fetchUserPackageEnrollments,
} from "@/lib/packages/api";
import { type PackageEnrollmentStatus } from "@/lib/packages/types";
import {
  fetchQfSessionStatus,
  type QfSessionStatus,
} from "@/lib/qf/sessionBrowser";
import { getSurahName } from "@/lib/quranMeta";

const GUEST_PACKAGE_STATUS_PREFIX = "murajaah.guest.packageStatus";

export default function HistoryPage() {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const user = useAuthStore((state) => state.user);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  const dueQueue = useReviewStore((state) => state.dueQueue);
  const isQueueLoading = useReviewStore((state) => state.isQueueLoading);
  const loadDueQueue = useReviewStore((state) => state.loadDueQueue);

  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalReviewedVerses, setTotalReviewedVerses] = useState(0);
  const [newVerseKeysToday, setNewVerseKeysToday] = useState(0);
  const [averageEaseFactor, setAverageEaseFactor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [packageStatusById, setPackageStatusById] = useState<Record<string, PackageEnrollmentStatus>>({});
  const [qfSession, setQfSession] = useState<QfSessionStatus>({
    linked: false,
    qfUserId: null,
    appUserId: null,
  });

  const persistedUserId = user?.id ?? qfSession.appUserId;
  const activeUserId = persistedUserId ?? guestUserId;

  const activePackagesCount = useMemo(
    () => Object.values(packageStatusById).filter((s) => s === "active").length,
    [packageStatusById],
  );

  useEffect(() => {
    void initializeAuth();
    initializeLocale();
    initializeTheme();
    setGuestUserId(getGuestUserId());
  }, [initializeAuth, initializeLocale, initializeTheme]);

  useEffect(() => {
    const load = async () => {
      const status = await fetchQfSessionStatus();
      setQfSession(status);
    };
    void load();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!persistedUserId && !guestUserId) return;

      if (!persistedUserId && guestUserId) {
        const raw = window.localStorage.getItem(
          `${GUEST_PACKAGE_STATUS_PREFIX}.${guestUserId}`,
        );
        if (raw) {
          try {
            setPackageStatusById(JSON.parse(raw) as Record<string, PackageEnrollmentStatus>);
          } catch {
            setPackageStatusById({});
          }
        }
        return;
      }

      if (!persistedUserId) return;

      try {
        const map = await fetchUserPackageEnrollments(persistedUserId);
        setPackageStatusById(
          Object.entries(map).reduce<Record<string, PackageEnrollmentStatus>>(
            (acc, [id, e]) => { acc[id] = e.status; return acc; },
            {},
          ),
        );
      } catch {
        setPackageStatusById({});
      }
    };
    void loadEnrollments();
  }, [persistedUserId, guestUserId]);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);

      if (!activeUserId) {
        setCurrentStreak(0);
        setLongestStreak(0);
        setTotalReviewedVerses(0);
        setNewVerseKeysToday(0);
        setAverageEaseFactor(null);
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).toISOString();

      const allRows = await murajaahDB.ayahProgress
        .toCollection()
        .filter((row) => row.userId === activeUserId)
        .toArray();

      const reviewed = new Set<string>();
      const newToday = new Set<string>();
      const dates: string[] = [];

      allRows.forEach((row) => {
        reviewed.add(toVerseKey(row.surahNumber, row.ayahNumber));
        dates.push(row.updatedAt);
        if (row.updatedAt >= startOfDay && row.repetitions <= 1) {
          newToday.add(toVerseKey(row.surahNumber, row.ayahNumber));
        }
      });

      const streak = calculateStreakFromIsoDates(dates);
      setCurrentStreak(streak.current);
      setLongestStreak(streak.longest);
      setTotalReviewedVerses(reviewed.size);
      setNewVerseKeysToday(newToday.size);
      setAverageEaseFactor(
        allRows.length > 0
          ? Number(
              (allRows.reduce((s, r) => s + r.easeFactor, 0) / allRows.length).toFixed(2),
            )
          : null,
      );

      setIsLoading(false);
    };

    void loadStats();
  }, [activeUserId]);

  useEffect(() => {
    if (activeUserId) void loadDueQueue(activeUserId);
  }, [activeUserId, loadDueQueue]);

  const handleStartDueReview = (verseKey: string) => {
    const [surahStr] = verseKey.split(":");
    router.push(`/practice/surah/${Number.parseInt(surahStr ?? "1", 10)}`);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center animate-fade-in">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 rounded-[28px] border border-emerald-900/10 bg-white/40 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(6,78,59,0.35)] backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/35">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/30">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">
                {t("page.historySectionTitle", locale)}
              </h1>
              <p className="text-xs text-emerald-900/55 dark:text-emerald-200/55">Your streaks &amp; review stats</p>
            </div>
          </div>
        </div>

        <div className="animate-slide-up-delay-1 relative overflow-hidden rounded-[28px] border border-orange-200/60 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6 shadow-[0_20px_60px_-30px_rgba(234,88,12,0.25)] dark:border-orange-800/30 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-yellow-950/20">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-200/30 dark:bg-orange-800/20" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-amber-200/20 dark:bg-amber-800/15" />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800/70 dark:text-orange-300/70">
                Current Streak
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-6xl font-bold text-orange-700 dark:text-orange-400">
                  {currentStreak}
                </span>
                <span className="text-lg font-medium text-orange-700/70 dark:text-orange-400/70">
                  day{currentStreak !== 1 ? "s" : ""}
                </span>
              </div>
              {longestStreak > 0 && (
                <p className="mt-2 text-sm text-orange-700/60 dark:text-orange-300/60">
                  Best: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/40">
              <Flame className="h-9 w-9 text-orange-500 dark:text-orange-400" strokeWidth={1.8} />
            </div>
          </div>

          {currentStreak === 0 && (
            <p className="relative mt-3 text-xs text-orange-700/60 dark:text-orange-300/60">
              Complete a review today to start your streak!
            </p>
          )}
        </div>

        <div className="animate-slide-up-delay-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              label: t("page.totalReviewedVerses", locale),
              value: totalReviewedVerses,
              icon: <BookOpen className="h-4 w-4" />,
            },
            {
              label: t("page.newToday", locale),
              value: newVerseKeysToday,
            },
            {
              label: t("page.dueNow", locale),
              value: isQueueLoading ? "…" : dueQueue.length,
            },
            {
              label: t("page.activePackagesCount", locale),
              value: activePackagesCount,
            },
            {
              label: t("page.averageEf", locale),
              value: averageEaseFactor?.toFixed(2) ?? "–",
            },
            {
              label: t("page.longestStreak", locale),
              value: longestStreak,
              suffix: longestStreak !== 1 ? " days" : " day",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{ animationDelay: `${200 + i * 60}ms` }}
              className="animate-slide-up rounded-[20px] border border-emerald-900/10 bg-white/70 p-4 shadow-[0_8px_24px_-12px_rgba(6,78,59,0.12)] backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/50"
            >
              <p className="text-[11px] font-medium leading-tight text-emerald-900/60 dark:text-emerald-200/60">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
                {stat.value}
                {stat.suffix && (
                  <span className="text-sm font-normal text-emerald-900/50">
                    {stat.suffix}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {dueQueue.length > 0 && (
          <div className="animate-slide-up-delay-3 rounded-[24px] border border-emerald-900/10 bg-white/65 p-5 shadow-[0_12px_36px_-16px_rgba(6,78,59,0.18)] backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/50">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                {t("page.dueReviews", locale)}
              </p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {dueQueue.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 overflow-y-auto" style={{ maxHeight: "160px" }}>
              {dueQueue.map((item) => {
                const verseKey = toVerseKey(item.surahNumber, item.ayahNumber);
                return (
                  <button
                    key={verseKey}
                    type="button"
                    onClick={() => handleStartDueReview(verseKey)}
                    className="rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 transition-all duration-150 hover:bg-emerald-100 active:scale-95 dark:border-emerald-100/10 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                  >
                    {getSurahName(item.surahNumber)} {item.ayahNumber}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
