"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import InfoModal, { type InfoTab } from "@/components/ui/InfoModal";
import AyahCard, { type AyahCardData } from "@/components/quran/AyahCard";
import { toUserError } from "@/lib/errorHandling";
import { getGuestUserId } from "@/lib/guest";
import { t } from "@/lib/i18n";
import {
  fetchPublishedMemorizationPackages,
  fetchUserPackageEnrollments,
  setUserPackageEnrollmentStatus,
} from "@/lib/packages/api";
import {
  type MemorizationPackage,
  type PackageEnrollmentStatus,
} from "@/lib/packages/types";
import { startBackgroundSync } from "@/lib/offline/sync";
import { fetchAyahByKey, fetchNextAyah, toVerseKey } from "@/lib/quranApi";
import { type SM2Rating } from "@/lib/srs";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { useReviewStore } from "@/store/reviewStore";
import { useThemeStore } from "@/store/themeStore";

const defaultVerseKey = "1:1";

export default function Home() {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const signOut = useAuthStore((state) => state.signOut);

  const latestProgress = useReviewStore((state) => state.latestProgress);
  const dueQueue = useReviewStore((state) => state.dueQueue);
  const isQueueLoading = useReviewStore((state) => state.isQueueLoading);
  const isSaving = useReviewStore((state) => state.isSaving);
  const error = useReviewStore((state) => state.error);
  const rateAyah = useReviewStore((state) => state.rateAyah);
  const loadDueQueue = useReviewStore((state) => state.loadDueQueue);
  const loadAyahProgress = useReviewStore((state) => state.loadAyahProgress);

  const [ayah, setAyah] = useState<AyahCardData | null>(null);
  const [ayahLoading, setAyahLoading] = useState(true);
  const [ayahError, setAyahError] = useState<string | null>(null);
  const [selectedVerseKey, setSelectedVerseKey] = useState(defaultVerseKey);
  const [packages, setPackages] = useState<MemorizationPackage[]>([]);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [packageStatusById, setPackageStatusById] = useState<
    Record<string, PackageEnrollmentStatus>
  >({});
  const [packageActionId, setPackageActionId] = useState<string | null>(null);
  const [isPackagesCollapsed, setIsPackagesCollapsed] = useState(true);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab>("source");

  const activeUserId = user?.id ?? guestUserId;
  const isGuestMode = !user && Boolean(guestUserId);

  const loadAyahFromApi = async (verseKey: string) => {
    setAyahLoading(true);
    setAyahError(null);

    try {
      const nextAyah = await fetchAyahByKey(verseKey);
      setAyah(nextAyah);
      setSelectedVerseKey(verseKey);
    } catch (loadError) {
      const message = toUserError("QURAN-AYAH-001", loadError);
      setAyahError(message);
    } finally {
      setAyahLoading(false);
    }
  };

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    setGuestUserId(getGuestUserId());
  }, []);

  useEffect(() => {
    initializeLocale();
  }, [initializeLocale]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    void loadAyahFromApi(defaultVerseKey);
  }, []);

  useEffect(() => {
    const loadPackages = async () => {
      setPackagesError(null);

      try {
        const publishedPackages = await fetchPublishedMemorizationPackages();
        setPackages(publishedPackages);

        if (publishedPackages.length > 0) {
          const firstPackage = publishedPackages[0];
          setSelectedPackageId(firstPackage.id);
          void loadAyahFromApi(firstPackage.starterVerseKey);
        }
      } catch (error) {
        const message = toUserError("PKG-LIST-001", error);
        setPackagesError(message);
        setPackages([]);
      }
    };

    void loadPackages();
  }, []);

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!user?.id) {
        setPackageStatusById({});
        return;
      }

      try {
        const enrollmentMap = await fetchUserPackageEnrollments(user.id);
        setPackageStatusById(enrollmentMap);
      } catch (error) {
        const message = toUserError("PKG-ENROLL-001", error);
        setPackagesError(message);
      }
    };

    void loadEnrollments();
  }, [user?.id]);

  useEffect(() => {
    if (activeUserId && ayah) {
      void loadAyahProgress(activeUserId, ayah.surahNumber, ayah.ayahNumber);
      void loadDueQueue(activeUserId);

      const stopSync = startBackgroundSync();
      return () => {
        stopSync();
      };
    }
  }, [activeUserId, ayah, loadAyahProgress, loadDueQueue]);

  const handleRate = async (rating: SM2Rating) => {
    if (!activeUserId || !ayah) return;

    await rateAyah({
      userId: activeUserId,
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      rating,
    });

    void loadDueQueue(activeUserId);

    try {
      const nextAyah = await fetchNextAyah(ayah.surahNumber, ayah.ayahNumber);
      setAyah(nextAyah);
      setSelectedVerseKey(nextAyah.verseKey);
      setAyahError(null);
      void loadAyahProgress(
        activeUserId,
        nextAyah.surahNumber,
        nextAyah.ayahNumber,
      );
    } catch (loadError) {
      const message = toUserError("QURAN-AYAH-001", loadError);
      setAyahError(message);
    }
  };

  const handleStartDueReview = (verseKey: string) => {
    void loadAyahFromApi(verseKey);
  };

  const handleSelectPackage = (packageId: string) => {
    const nextPackage = packages.find((item) => item.id === packageId);

    if (!nextPackage) {
      return;
    }

    setSelectedPackageId(packageId);
    void loadAyahFromApi(nextPackage.starterVerseKey);
  };

  const openInfoModal = (tab: InfoTab) => {
    setActiveInfoTab(tab);
    setIsInfoModalOpen(true);
  };

  const updatePackageStatus = async (
    packageId: string,
    status: PackageEnrollmentStatus,
  ) => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    setPackageActionId(packageId);
    setPackagesError(null);

    try {
      await setUserPackageEnrollmentStatus(user.id, packageId, status);
      setPackageStatusById((prev) => ({
        ...prev,
        [packageId]: status,
      }));

      if (status === "active") {
        handleSelectPackage(packageId);
      }
    } catch (error) {
      const message = toUserError("PKG-UPDATE-001", error);
      setPackagesError(message);
    } finally {
      setPackageActionId(null);
    }
  };

  const statusLabel = (status: PackageEnrollmentStatus | undefined) => {
    if (status === "active") return t("page.statusActive", locale);
    if (status === "paused") return t("page.statusPaused", locale);
    if (status === "completed") return t("page.statusCompleted", locale);
    return t("page.statusNotStarted", locale);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const maskEmail = (email: string | undefined | null) => {
    if (!email || !email.includes("@")) {
      return "***";
    }

    const [localPart, domain] = email.split("@");
    const first = localPart.slice(0, 1);
    const last = localPart.length > 1 ? localPart.slice(-1) : "";
    const maskedMiddle = "*".repeat(
      Math.max(localPart.length - (last ? 2 : 1), 2),
    );

    return `${first}${maskedMiddle}${last}@${domain}`;
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center text-emerald-950">
          <p>{t("common.loading", locale)}</p>
        </div>
      </main>
    );
  }

  if (!activeUserId) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center text-emerald-950">
          <p>{t("common.loading", locale)}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-6 w-full max-w-4xl rounded-[28px] border border-emerald-900/10 bg-white/40 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(6,78,59,0.5)] backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/35">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.svg"
              alt="Murajaah logo"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl"
            />
            <div className="text-sm text-emerald-900/70 dark:text-emerald-200/80">
              <p className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
                Murajaah
              </p>
              <p>
                {isGuestMode ? (
                  <>
                    Guest mode{" "}
                    <span className="font-medium text-emerald-950 dark:text-emerald-100">
                      (local only)
                    </span>
                  </>
                ) : (
                  <>
                    {t("auth.loggedInAs", locale)}:{" "}
                    <span className="font-medium text-emerald-950 dark:text-emerald-100">
                      {maskEmail(user?.email)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
              {t("common.language", locale)}:
            </span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                locale === "en"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("id")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                locale === "id"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              ID
            </button>
            <span className="ml-2 text-xs text-emerald-900/70 dark:text-emerald-200/80">
              {t("common.theme", locale)}:
            </span>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                theme === "light"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              {t("common.light", locale)}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                theme === "dark"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              {t("common.dark", locale)}
            </button>
            {isGuestMode ? (
              <button
                type="button"
                onClick={() => {
                  router.push("/login");
                }}
                className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-900/30 transition-colors dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
              >
                {t("auth.signIn", locale)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleSignOut();
                }}
                className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-900/30 transition-colors dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
              >
                {t("auth.signOut", locale)}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="w-full max-w-4xl space-y-4">
        <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-5 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="font-semibold">
                {t("page.learningPackages", locale)}
              </p>
              <span className="rounded-full border border-emerald-900/10 bg-emerald-900/5 px-3 py-1 text-[11px] font-medium text-emerald-900/70 dark:border-emerald-100/10 dark:bg-emerald-100/5 dark:text-emerald-100/70">
                {packages.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPackagesCollapsed((current) => !current)}
              className="rounded-full border border-emerald-900/15 bg-emerald-900/5 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
            >
              {isPackagesCollapsed
                ? t("page.showPackages", locale)
                : t("page.hidePackages", locale)}
            </button>
          </div>
          {packagesError ? (
            <div className="mt-2 rounded-xl border border-rose-700/30 bg-rose-50 p-3 text-rose-900 dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
              {packagesError}
            </div>
          ) : null}
          {!isPackagesCollapsed ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {packages.map((item) => {
                const isSelected = item.id === selectedPackageId;
                const status = packageStatusById[item.id];
                const isBusy = packageActionId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isSelected
                        ? "border-emerald-900 bg-emerald-900 text-white shadow-md"
                        : "border-emerald-900/25 bg-white text-emerald-900 hover:border-emerald-900/40 hover:bg-emerald-50/70 dark:border-emerald-200/15 dark:bg-emerald-950/45 dark:text-emerald-100 dark:hover:bg-emerald-900/55"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectPackage(item.id);
                      }}
                      className="w-full text-left"
                    >
                      <p className="font-semibold">{item.title}</p>
                      <p
                        className={
                          isSelected
                            ? "text-emerald-50/90"
                            : "text-emerald-900/70"
                        }
                      >
                        {item.description}
                      </p>
                      <p
                        className={`mt-1 font-medium ${
                          isSelected ? "text-emerald-50" : "text-emerald-800"
                        }`}
                      >
                        {t("page.status", locale)}: {statusLabel(status)}
                      </p>
                    </button>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void updatePackageStatus(item.id, "active");
                        }}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-emerald-900 text-white hover:bg-emerald-800"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {status === "active"
                          ? t("page.resume", locale)
                          : t("page.start", locale)}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void updatePackageStatus(item.id, "paused");
                        }}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-emerald-900/15 text-emerald-900 hover:bg-emerald-900/25"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {t("page.pause", locale)}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void updatePackageStatus(item.id, "completed");
                        }}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-emerald-900/15 text-emerald-900 hover:bg-emerald-900/25"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {t("page.complete", locale)}
                      </button>
                    </div>
                  </div>
                );
              })}

              {packages.length === 0 && !packagesError ? (
                <div className="rounded-lg border border-emerald-900/25 bg-white p-3 text-emerald-900/70 dark:border-emerald-200/25 dark:bg-emerald-900/40 dark:text-emerald-200/80">
                  {t("page.noPublishedPackages", locale)}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-5 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{t("page.dueReviews", locale)}</p>
              <p className="text-emerald-900/70 dark:text-emerald-200/80">
                {isQueueLoading
                  ? t("page.loadingDueQueue", locale)
                  : `${dueQueue.length} ${
                      dueQueue.length === 1
                        ? t("page.ayahDueSingular", locale)
                        : t("page.ayahDuePlural", locale)
                    }`}
              </p>
              <p className="mt-1 text-xs text-emerald-800/70 dark:text-emerald-200/70">
                {t("page.nextReviewAuto", locale)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadAyahFromApi(defaultVerseKey);
              }}
              className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {t("page.loadFallbackAyah", locale)}
            </button>
          </div>

          {dueQueue.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {dueQueue.map((item) => {
                const verseKey = toVerseKey(item.surahNumber, item.ayahNumber);
                const isSelected = selectedVerseKey === verseKey;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleStartDueReview(verseKey);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-emerald-900 bg-emerald-900 text-white"
                        : "border-emerald-900/30 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
                    }`}
                  >
                    {verseKey}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {ayahLoading ? (
          <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            {t("page.loadingAyah", locale)}
          </div>
        ) : null}
        {ayahError ? (
          <div className="rounded-[28px] border border-rose-700/30 bg-rose-50 p-4 text-sm text-rose-900 shadow-[0_20px_60px_-36px_rgba(190,24,93,0.35)] dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
            {ayahError}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  void loadAyahFromApi(selectedVerseKey);
                }}
                className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-800"
              >
                {t("common.retry", locale)}
              </button>
            </div>
          </div>
        ) : null}
        {ayah ? (
          <AyahCard
            ayah={ayah}
            onRate={handleRate}
            reviewState={
              latestProgress
                ? {
                    easeFactor: latestProgress.easeFactor,
                    interval: latestProgress.interval,
                    repetitions: latestProgress.repetitions,
                  }
                : null
            }
          />
        ) : null}
        <section className="rounded-[28px] border border-amber-500/20 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-[0_20px_60px_-36px_rgba(217,119,6,0.28)] dark:border-amber-300/20 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">{t("page.disclaimer", locale)}</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
            {t("page.checkMushaf", locale)}
          </p>
        </section>
        {latestProgress ? (
          <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            {t("page.ef", locale)}: {latestProgress.easeFactor} ·{" "}
            {t("page.interval", locale)}: {latestProgress.interval}d ·{" "}
            {t("page.reps", locale)}: {latestProgress.repetitions}
          </div>
        ) : null}
        {isSaving ? (
          <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            {t("page.savingReview", locale)}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[28px] border border-rose-700/30 bg-rose-50 p-4 text-sm text-rose-900 shadow-[0_20px_60px_-36px_rgba(190,24,93,0.35)] dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-5 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="font-semibold">{t("page.methodology", locale)}</p>
            <div className="mt-3 space-y-2 text-emerald-900/80 dark:text-emerald-200/80">
              <p>{t("page.methodologyStep1", locale)}</p>
              <p>{t("page.methodologyStep2", locale)}</p>
              <p>{t("page.methodologyStep3", locale)}</p>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-900/10 bg-emerald-900/5 p-4 text-emerald-900/80 dark:border-emerald-100/10 dark:bg-emerald-100/5 dark:text-emerald-100/80">
              <p>{t("page.ankiInspired", locale)}</p>
              <a
                href="https://apps.ankiweb.net/"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
              >
                {t("page.ankiLink", locale)}
              </a>
            </div>
          </div>

          <aside className="rounded-[28px] border border-emerald-900/20 bg-gradient-to-br from-emerald-900 to-emerald-700 p-5 text-sm text-white shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] dark:border-emerald-200/20 dark:from-emerald-900 dark:to-emerald-800">
            <p className="font-semibold">{t("page.infoCenter", locale)}</p>
            <p className="mt-2 text-white/90">
              {t("page.infoCenterDescription", locale)}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-label={`${t("page.openInfoCenter", locale)}: ${t("page.sourceTab", locale)}`}
                onClick={() => openInfoModal("source")}
                className="rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 17A2.5 2.5 0 0 0 4 14.5V5a2 2 0 0 1 2-2h14v14" />
                </svg>
                <p className="mt-2 text-xs font-semibold text-white">
                  {t("page.sourceTab", locale)}
                </p>
              </button>

              <button
                type="button"
                aria-label={`${t("page.openInfoCenter", locale)}: ${t("page.creditTab", locale)}`}
                onClick={() => openInfoModal("credit")}
                className="rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
                <p className="mt-2 text-xs font-semibold text-white">
                  {t("page.creditTab", locale)}
                </p>
              </button>

              <button
                type="button"
                aria-label={`${t("page.openInfoCenter", locale)}: ${t("page.legalTab", locale)}`}
                onClick={() => openInfoModal("legal")}
                className="rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 5 7v5c0 5 3.5 7.5 7 9 3.5-1.5 7-4 7-9V7l-7-4Z" />
                  <path d="m9.5 12 1.5 1.5 3.5-3.5" />
                </svg>
                <p className="mt-2 text-xs font-semibold text-white">
                  {t("page.legalTab", locale)}
                </p>
              </button>

              <button
                type="button"
                aria-label={`${t("page.openInfoCenter", locale)}: ${t("page.feedbackTab", locale)}`}
                onClick={() => openInfoModal("feedback")}
                className="rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                </svg>
                <p className="mt-2 text-xs font-semibold text-white">
                  {t("page.feedbackTab", locale)}
                </p>
              </button>
            </div>
          </aside>
        </section>
      </div>

      <InfoModal
        activeTab={activeInfoTab}
        isOpen={isInfoModalOpen}
        locale={locale}
        onClose={() => setIsInfoModalOpen(false)}
        onSelectTab={setActiveInfoTab}
      />
    </main>
  );
}
