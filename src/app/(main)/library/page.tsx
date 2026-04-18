"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Play, BookOpen } from "lucide-react";

import { t } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { getGuestUserId } from "@/lib/guest";
import { getSurahName } from "@/lib/quranMeta";
import { toVerseKey } from "@/lib/quranApi";
import { toUserError } from "@/lib/errorHandling";
import {
  fetchPublishedMemorizationPackages,
  fetchUserPackageEnrollments,
  setUserPackageEnrollmentStatus,
} from "@/lib/packages/api";
import { fetchUserSurahTracks, addUserSurahTrack } from "@/lib/surahTracks";
import { murajaahDB } from "@/lib/offline/db";
import { PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  type MemorizationPackage,
  type PackageEnrollmentStatus,
} from "@/lib/packages/types";
import {
  getPackageProgressSnapshot,
  getPackageVerseKeys,
} from "@/lib/packages/progress";
import {
  fetchQfSessionStatus,
  type QfSessionStatus,
} from "@/lib/qf/sessionBrowser";

const TOTAL_SURAHS = 114;
const PACKAGE_PAGE_SIZE = 8;
const GUEST_PACKAGE_STATUS_PREFIX = "murajaah.guest.packageStatus";
const GUEST_SURAH_TRACKS_PREFIX = "murajaah.guest.surahTracks";

const allSurahOptions = Array.from({ length: TOTAL_SURAHS }, (_, i) => ({
  surahNumber: i + 1,
  label: `${i + 1}. ${getSurahName(i + 1)}`,
}));

type LibraryTab = "surah" | "packages";

export default function LibraryPage() {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const user = useAuthStore((state) => state.user);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  const [tab, setTab] = useState<LibraryTab>("surah");
  const [surahSearch, setSurahSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [packagePage, setPackagePage] = useState(1);
  const [packages, setPackages] = useState<MemorizationPackage[]>([]);
  const [packageStatusById, setPackageStatusById] = useState<
    Record<string, PackageEnrollmentStatus>
  >({});
  const [reviewedVerseKeys, setReviewedVerseKeys] = useState<Set<string>>(
    new Set(),
  );
  const [packageActionId, setPackageActionId] = useState<string | null>(null);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [activeSurahTrackNumbers, setActiveSurahTrackNumbers] = useState<
    number[]
  >([]);
  const [qfSession, setQfSession] = useState<QfSessionStatus>({
    linked: false,
    qfUserId: null,
    appUserId: null,
  });

  const persistedUserId = user?.id ?? qfSession.appUserId;
  const activeUserId = persistedUserId ?? guestUserId;
  const isGuestMode = !persistedUserId && Boolean(guestUserId);

  const filteredSurahOptions = useMemo(() => {
    const q = surahSearch.trim().toLowerCase();
    if (!q) return allSurahOptions;
    return allSurahOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [surahSearch]);

  const filteredPackages = useMemo(() => {
    const q = packageSearch.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [packages, packageSearch]);

  const packagePageCount = Math.max(
    1,
    Math.ceil(filteredPackages.length / PACKAGE_PAGE_SIZE),
  );

  const paginatedPackages = useMemo(() => {
    const start = (packagePage - 1) * PACKAGE_PAGE_SIZE;
    return filteredPackages.slice(start, start + PACKAGE_PAGE_SIZE);
  }, [filteredPackages, packagePage]);

  const packageProgressById = useMemo(() => {
    const map: Record<
      string,
      { totalVerses: number; reviewedVerses: number; progressPercent: number }
    > = {};
    packages.forEach((item) => {
      map[item.id] = getPackageProgressSnapshot(item, reviewedVerseKeys);
    });
    return map;
  }, [packages, reviewedVerseKeys]);

  useEffect(() => {
    void initializeAuth();
    initializeLocale();
    initializeTheme();
    setGuestUserId(getGuestUserId());
  }, [initializeAuth, initializeLocale, initializeTheme]);

  useEffect(() => {
    const loadQfSession = async () => {
      const status = await fetchQfSessionStatus();
      setQfSession(status);
    };
    void loadQfSession();
  }, []);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const published = await fetchPublishedMemorizationPackages();
        setPackages(published);
      } catch {
        setPackages(PACKAGE_CATALOG);
      }
    };
    void loadPackages();
  }, []);

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!persistedUserId && !guestUserId) return;

      if (!persistedUserId && guestUserId) {
        const raw = window.localStorage.getItem(
          `${GUEST_PACKAGE_STATUS_PREFIX}.${guestUserId}`,
        );
        if (raw) {
          try {
            setPackageStatusById(
              JSON.parse(raw) as Record<string, PackageEnrollmentStatus>,
            );
          } catch {
            setPackageStatusById({});
          }
        }
        return;
      }

      if (!persistedUserId) return;

      try {
        const enrollmentMap =
          await fetchUserPackageEnrollments(persistedUserId);
        setPackageStatusById(
          Object.entries(enrollmentMap).reduce<
            Record<string, PackageEnrollmentStatus>
          >((acc, [id, enrollment]) => {
            acc[id] = enrollment.status;
            return acc;
          }, {}),
        );
      } catch (err) {
        setPackagesError(toUserError("PKG-ENROLL-001", err));
      }
    };
    void loadEnrollments();
  }, [persistedUserId, guestUserId]);

  useEffect(() => {
    const loadSurahTracks = async () => {
      if (!activeUserId) return;

      if (isGuestMode && guestUserId) {
        const raw = window.localStorage.getItem(
          `${GUEST_SURAH_TRACKS_PREFIX}.${guestUserId}`,
        );
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as number[];
            if (Array.isArray(parsed)) setActiveSurahTrackNumbers(parsed);
          } catch {
            setActiveSurahTrackNumbers([]);
          }
        }
        return;
      }

      if (!persistedUserId) return;

      try {
        const tracks = await fetchUserSurahTracks(persistedUserId);
        setActiveSurahTrackNumbers(tracks);
      } catch {
        setActiveSurahTrackNumbers([]);
      }
    };
    void loadSurahTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedUserId, guestUserId]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!activeUserId) {
        setReviewedVerseKeys(new Set());
        return;
      }
      const allRows = await murajaahDB.ayahProgress
        .toCollection()
        .filter((row) => row.userId === activeUserId)
        .toArray();
      const reviewed = new Set<string>();
      allRows.forEach((row) =>
        reviewed.add(toVerseKey(row.surahNumber, row.ayahNumber)),
      );
      setReviewedVerseKeys(reviewed);
    };
    void loadProgress();
  }, [activeUserId]);

  useEffect(() => {
    setPackagePage(1);
  }, [packageSearch, tab]);

  useEffect(() => {
    if (packagePage > packagePageCount) setPackagePage(packagePageCount);
  }, [packagePage, packagePageCount]);

  useEffect(() => {
    if (!isGuestMode || !guestUserId) return;
    window.localStorage.setItem(
      `${GUEST_PACKAGE_STATUS_PREFIX}.${guestUserId}`,
      JSON.stringify(packageStatusById),
    );
  }, [isGuestMode, guestUserId, packageStatusById]);

  const registerSurahTrack = useCallback(
    (surahNumber: number) => {
      setActiveSurahTrackNumbers((prev) => {
        if (prev.includes(surahNumber)) return prev;
        const next = [surahNumber, ...prev].slice(0, 24);
        if (persistedUserId && !isGuestMode) {
          void addUserSurahTrack(persistedUserId, surahNumber);
        }
        if (isGuestMode && guestUserId) {
          window.localStorage.setItem(
            `${GUEST_SURAH_TRACKS_PREFIX}.${guestUserId}`,
            JSON.stringify(next),
          );
        }
        return next;
      });
    },
    [persistedUserId, isGuestMode, guestUserId],
  );

  const handleOpenSurah = (surahNumber: number) => {
    registerSurahTrack(surahNumber);
    router.push(`/practice/surah/${surahNumber}`);
  };

  const handleStartPackage = async (packageId: string) => {
    if (!activeUserId) return;
    setPackageActionId(packageId);
    setPackagesError(null);

    try {
      if (persistedUserId && !isGuestMode) {
        await setUserPackageEnrollmentStatus(
          persistedUserId,
          packageId,
          "active",
        );
      }
      setPackageStatusById((prev) => ({ ...prev, [packageId]: "active" }));
      router.push(`/practice/package/${packageId}`);
    } catch (err) {
      setPackagesError(toUserError("PKG-UPDATE-001", err));
    } finally {
      setPackageActionId(null);
    }
  };

  const handleResumePackage = (packageId: string) => {
    router.push(`/practice/package/${packageId}`);
  };

  const statusLabel = (status: PackageEnrollmentStatus | undefined) => {
    if (!status) return t("page.statusNotStarted", locale);
    if (status === "active") return t("page.statusActive", locale);
    if (status === "paused") return t("page.statusPaused", locale);
    if (status === "completed") return t("page.statusCompleted", locale);
    return t("page.statusNotStarted", locale);
  };

  const activeSurahCount = activeSurahTrackNumbers.length;
  const activePackageCount = Object.values(packageStatusById).filter(
    (s) => s === "active",
  ).length;

  // Determine dark/light for data attribute
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [theme]);

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 animate-slide-up">
          <div className="flex items-center gap-3 rounded-[28px] border border-emerald-900/10 bg-white/40 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(6,78,59,0.35)] backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/35">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900/8 dark:bg-emerald-100/10">
              <BookOpen className="h-5 w-5 text-emerald-800 dark:text-emerald-300" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Library</h1>
              <p className="text-xs text-emerald-900/55 dark:text-emerald-200/55">
                {t("page.learningPackagesDescription", locale)}
              </p>
            </div>
          </div>
        </div>

        <div className="animate-slide-up-delay-1 mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("surah")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
              tab === "surah"
                ? "bg-emerald-900 text-white shadow-[0_4px_12px_-4px_rgba(6,78,59,0.4)] dark:bg-emerald-500 dark:text-emerald-950"
                : "border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
            }`}
          >
            Surah
          </button>
          <button
            type="button"
            onClick={() => setTab("packages")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
              tab === "packages"
                ? "bg-emerald-900 text-white shadow-[0_4px_12px_-4px_rgba(6,78,59,0.4)] dark:bg-emerald-500 dark:text-emerald-950"
                : "border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
            }`}
          >
            {t("page.learningPackages", locale)}
          </button>
        </div>

        {tab === "surah" && (
          <div className="animate-fade-in space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-900/40 dark:text-emerald-200/40" />
              <input
                type="search"
                value={surahSearch}
                onChange={(e) => setSurahSearch(e.target.value)}
                placeholder={t("page.searchSurah", locale)}
                className="w-full rounded-2xl border border-emerald-900/15 bg-white/80 py-3 pl-10 pr-4 text-sm text-emerald-950 outline-none transition-all duration-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
              />
            </div>

            {filteredSurahOptions.length === 0 ? (
              <p className="py-8 text-center text-sm text-emerald-900/50 dark:text-emerald-200/50">
                {t("page.noSurahMatch", locale)}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredSurahOptions.map((option, idx) => {
                  const isActive = activeSurahTrackNumbers.includes(
                    option.surahNumber,
                  );
                  return (
                    <div
                      key={option.surahNumber}
                      style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                      className="animate-slide-up flex items-center justify-between rounded-2xl border border-emerald-900/10 bg-white/70 px-4 py-3.5 transition-all duration-150 hover:border-emerald-900/20 hover:shadow-[0_8px_20px_-8px_rgba(6,78,59,0.15)] dark:border-emerald-100/10 dark:bg-emerald-950/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                          {option.label}
                        </p>
                        {isActive && (
                          <span className="mt-0.5 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenSurah(option.surahNumber)}
                        className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-white shadow-[0_4px_12px_-4px_rgba(6,78,59,0.45)] transition-all duration-200 hover:bg-emerald-800 hover:scale-105 active:scale-95 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                        aria-label={`Start ${option.label}`}
                      >
                        <Play className="h-3.5 w-3.5 translate-x-px" strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "packages" && (
          <div className="animate-fade-in space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-900/40 dark:text-emerald-200/40" />
              <input
                type="search"
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                placeholder={t("page.searchPackage", locale)}
                className="w-full rounded-2xl border border-emerald-900/15 bg-white/80 py-3 pl-10 pr-4 text-sm text-emerald-950 outline-none transition-all duration-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
              />
            </div>

            {isGuestMode && (
              <p className="text-xs text-emerald-900/60 dark:text-emerald-200/60">
                {t("page.guestPackageStatusNote", locale)}
              </p>
            )}

            {packagesError && (
              <div className="rounded-xl border border-rose-700/30 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
                {packagesError}
              </div>
            )}

            {filteredPackages.length === 0 ? (
              <p className="py-8 text-center text-sm text-emerald-900/50 dark:text-emerald-200/50">
                {t("page.noPackageMatch", locale)}
              </p>
            ) : (
              <div className="space-y-3">
                {paginatedPackages.map((pkg, idx) => {
                  const status = packageStatusById[pkg.id];
                  const progress = packageProgressById[pkg.id] ?? {
                    totalVerses: 0,
                    reviewedVerses: 0,
                    progressPercent: 0,
                  };
                  const packageVerseKeys = getPackageVerseKeys(pkg);

                  return (
                    <div
                      key={pkg.id}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="animate-slide-up rounded-[20px] border border-emerald-900/10 bg-white/70 p-4 shadow-[0_8px_24px_-12px_rgba(6,78,59,0.12)] transition-all duration-150 hover:scale-[1.005] hover:shadow-[0_12px_32px_-12px_rgba(6,78,59,0.2)] dark:border-emerald-100/10 dark:bg-emerald-950/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                              {pkg.title}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                status === "active"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : status === "completed"
                                    ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                                    : status === "paused"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                              }`}
                            >
                              {statusLabel(status)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-emerald-900/60 dark:text-emerald-200/60">
                            {pkg.description}
                          </p>
                          <p className="mt-1 text-xs text-emerald-900/50 dark:text-emerald-200/50">
                            {packageVerseKeys.size} verses
                          </p>
                        </div>
                      </div>

                      {progress.totalVerses > 0 && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px] text-emerald-900/60 dark:text-emerald-200/60">
                              {t("page.progress", locale)}
                            </span>
                            <span className="text-[11px] font-medium text-emerald-900/80 dark:text-emerald-200/80">
                              {progress.reviewedVerses}/{progress.totalVerses}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-emerald-900/10 dark:bg-emerald-100/10">
                            <div
                              className="h-full rounded-full bg-emerald-600 transition-all duration-500 dark:bg-emerald-400"
                              style={{
                                width: `${progress.progressPercent}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        {!status || status === "paused" ? (
                          <button
                            type="button"
                            disabled={packageActionId === pkg.id}
                            onClick={() => void handleStartPackage(pkg.id)}
                            className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-emerald-800 active:scale-95 disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                          >
                            {packageActionId === pkg.id
                              ? "..."
                              : !status
                                ? t("page.start", locale)
                                : t("page.resume", locale)}
                          </button>
                        ) : status === "active" ? (
                          <button
                            type="button"
                            onClick={() => handleResumePackage(pkg.id)}
                            className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-emerald-800 active:scale-95 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                          >
                            {t("page.resume", locale)}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {packagePageCount > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={packagePage <= 1}
                  onClick={() => setPackagePage((p) => p - 1)}
                  className="rounded-xl border border-emerald-900/15 bg-white/60 px-4 py-2 text-sm font-medium text-emerald-900 transition-all duration-200 hover:bg-emerald-900/5 active:scale-95 disabled:opacity-40 dark:border-emerald-100/15 dark:bg-emerald-950/40 dark:text-emerald-100"
                >
                  {t("page.prev", locale)}
                </button>
                <span className="text-sm text-emerald-900/60 dark:text-emerald-200/60">
                  {packagePage} / {packagePageCount}
                </span>
                <button
                  type="button"
                  disabled={packagePage >= packagePageCount}
                  onClick={() => setPackagePage((p) => p + 1)}
                  className="rounded-xl border border-emerald-900/15 bg-white/60 px-4 py-2 text-sm font-medium text-emerald-900 transition-all duration-200 hover:bg-emerald-900/5 active:scale-95 disabled:opacity-40 dark:border-emerald-100/15 dark:bg-emerald-950/40 dark:text-emerald-100"
                >
                  {t("page.next", locale)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
