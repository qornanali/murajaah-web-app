"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import InfoModal, { type InfoTab } from "@/components/ui/InfoModal";
import OnboardingModal from "@/components/ui/OnboardingModal";
import AyahCard, { type AyahCardData } from "@/components/quran/AyahCard";
import MethodologySection from "@/components/sections/MethodologySection";
import { toUserError } from "@/lib/errorHandling";
import { getGuestUserId } from "@/lib/guest";
import { t } from "@/lib/i18n";
import {
  fetchPublishedMemorizationPackages,
  setUserPackageDailyNewTarget,
  fetchUserPackageEnrollments,
  setUserPackageEnrollmentStatus,
} from "@/lib/packages/api";
import { PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  type MemorizationPackage,
  type PackageEnrollmentStatus,
} from "@/lib/packages/types";
import {
  getPackageProgressSnapshot,
  getPackageVerseKeys,
} from "@/lib/packages/progress";
import { murajaahDB } from "@/lib/offline/db";
import { startBackgroundSync } from "@/lib/offline/sync";
import { fetchAyahByKey, fetchNextAyah, toVerseKey } from "@/lib/quranApi";
import { getSurahName } from "@/lib/quranMeta";
import { type SM2Rating } from "@/lib/srs";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { useReviewStore } from "@/store/reviewStore";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";

const defaultVerseKey = "1:1";
const TOTAL_SURAHS = 114;
const PACKAGE_PAGE_SIZE = 6;
const GUEST_PACKAGE_STATUS_PREFIX = "murajaah.guest.packageStatus";
const GUEST_PACKAGE_TARGET_PREFIX = "murajaah.guest.packageTarget";
const DEFAULT_DAILY_NEW_TARGET = 3;

const surahOptions = Array.from({ length: TOTAL_SURAHS }, (_, index) => {
  const surahNumber = index + 1;

  return {
    surahNumber,
    label: `${surahNumber}. ${getSurahName(surahNumber)}`,
  };
});

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
  const isInitialized = useAuthStore((state) => state.isInitialized);
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

  const hasSeenOnboardingModal = useUIStore(
    (state) => state.hasSeenOnboardingModal,
  );
  const initializeUIState = useUIStore((state) => state.initializeUIState);
  const dismissOnboardingModal = useUIStore(
    (state) => state.dismissOnboardingModal,
  );

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
  const [packageDailyTargetById, setPackageDailyTargetById] = useState<
    Record<string, number>
  >({});
  const [reviewedVerseKeys, setReviewedVerseKeys] = useState<Set<string>>(
    new Set(),
  );
  const [newVerseKeysToday, setNewVerseKeysToday] = useState<Set<string>>(
    new Set(),
  );
  const [dailyTargetNotice, setDailyTargetNotice] = useState<string | null>(
    null,
  );
  const [packageActionId, setPackageActionId] = useState<string | null>(null);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(1);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab>("source");
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);
  const [sourceSheetTab, setSourceSheetTab] = useState<"surah" | "packages">(
    "surah",
  );
  const [surahSearch, setSurahSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [packagePage, setPackagePage] = useState(1);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  const authenticatedUserId = user?.id;
  const activeUserId = user?.id ?? guestUserId;
  const isGuestMode = !user && Boolean(guestUserId);

  const normalizedSurahSearch = surahSearch.trim().toLowerCase();
  const normalizedPackageSearch = packageSearch.trim().toLowerCase();

  const filteredSurahOptions = useMemo(() => {
    if (!normalizedSurahSearch) {
      return surahOptions;
    }

    return surahOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedSurahSearch),
    );
  }, [normalizedSurahSearch]);

  const filteredPackages = useMemo(() => {
    if (!normalizedPackageSearch) {
      return packages;
    }

    return packages.filter((item) => {
      const title = item.title.toLowerCase();
      const description = item.description.toLowerCase();
      return (
        title.includes(normalizedPackageSearch) ||
        description.includes(normalizedPackageSearch)
      );
    });
  }, [packages, normalizedPackageSearch]);

  const packagePageCount = Math.max(
    1,
    Math.ceil(filteredPackages.length / PACKAGE_PAGE_SIZE),
  );

  const paginatedPackages = useMemo(() => {
    const start = (packagePage - 1) * PACKAGE_PAGE_SIZE;
    return filteredPackages.slice(start, start + PACKAGE_PAGE_SIZE);
  }, [filteredPackages, packagePage]);

  const packageVerseKeysById = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    packages.forEach((item) => {
      map[item.id] = getPackageVerseKeys(item);
    });

    return map;
  }, [packages]);

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

  const visibleDueQueue = useMemo(() => {
    if (!selectedPackageId) {
      return dueQueue;
    }

    const packageVerseKeys = packageVerseKeysById[selectedPackageId];

    if (!packageVerseKeys || packageVerseKeys.size === 0) {
      return dueQueue;
    }

    return dueQueue.filter((item) =>
      packageVerseKeys.has(toVerseKey(item.surahNumber, item.ayahNumber)),
    );
  }, [dueQueue, selectedPackageId, packageVerseKeysById]);

  const loadAyahFromApi = async (verseKey: string) => {
    setAyahLoading(true);
    setAyahError(null);

    try {
      const nextAyah = await fetchAyahByKey(verseKey);
      setAyah(nextAyah);
      setSelectedVerseKey(verseKey);
      setSelectedSurahNumber(nextAyah.surahNumber);
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
    initializeUIState();
  }, [initializeUIState]);

  useEffect(() => {
    void loadAyahFromApi(defaultVerseKey);
  }, []);

  useEffect(() => {
    const loadPackages = async () => {
      setPackagesError(null);

      try {
        const publishedPackages = await fetchPublishedMemorizationPackages();
        setPackages(publishedPackages);
      } catch {
        setPackages(PACKAGE_CATALOG);
      }
    };

    void loadPackages();
  }, []);

  useEffect(() => {
    if (isInitialized && !hasSeenOnboardingModal) {
      setIsOnboardingModalOpen(true);
    }
  }, [isInitialized, hasSeenOnboardingModal]);

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!authenticatedUserId && !guestUserId) {
        return;
      }

      if (!authenticatedUserId && guestUserId) {
        const statusStorageKey = `${GUEST_PACKAGE_STATUS_PREFIX}.${guestUserId}`;
        const targetStorageKey = `${GUEST_PACKAGE_TARGET_PREFIX}.${guestUserId}`;
        const rawStatus = window.localStorage.getItem(statusStorageKey);
        const rawTarget = window.localStorage.getItem(targetStorageKey);

        if (!rawStatus) {
          setPackageStatusById({});
          setPackageDailyTargetById({});
        } else {
          try {
            const parsed = JSON.parse(rawStatus) as Record<
              string,
              PackageEnrollmentStatus
            >;
            setPackageStatusById(parsed);
            setPackageDailyTargetById(
              Object.keys(parsed).reduce<Record<string, number>>((acc, id) => {
                acc[id] = DEFAULT_DAILY_NEW_TARGET;
                return acc;
              }, {}),
            );
          } catch {
            setPackageStatusById({});
            setPackageDailyTargetById({});
          }
        }

        try {
          if (!rawTarget) {
            return;
          }

          const parsedTargets = JSON.parse(rawTarget) as Record<string, number>;
          setPackageDailyTargetById((previous) => ({
            ...previous,
            ...parsedTargets,
          }));
        } catch {
          setPackageDailyTargetById({});
        }

        return;
      }

      if (!authenticatedUserId) {
        return;
      }

      try {
        const enrollmentMap =
          await fetchUserPackageEnrollments(authenticatedUserId);
        setPackageStatusById(
          Object.entries(enrollmentMap).reduce<
            Record<string, PackageEnrollmentStatus>
          >((acc, [packageId, enrollment]) => {
            acc[packageId] = enrollment.status;
            return acc;
          }, {}),
        );
        setPackageDailyTargetById(
          Object.entries(enrollmentMap).reduce<Record<string, number>>(
            (acc, [packageId, enrollment]) => {
              acc[packageId] = enrollment.dailyNewTarget;
              return acc;
            },
            {},
          ),
        );
      } catch (loadError) {
        const message = toUserError("PKG-ENROLL-001", loadError);
        setPackagesError(message);
      }
    };

    void loadEnrollments();
  }, [authenticatedUserId, guestUserId]);

  useEffect(() => {
    if (!isGuestMode || !guestUserId) {
      return;
    }

    const statusStorageKey = `${GUEST_PACKAGE_STATUS_PREFIX}.${guestUserId}`;
    window.localStorage.setItem(
      statusStorageKey,
      JSON.stringify(packageStatusById),
    );
  }, [isGuestMode, guestUserId, packageStatusById]);

  useEffect(() => {
    if (!isGuestMode || !guestUserId) {
      return;
    }

    const targetStorageKey = `${GUEST_PACKAGE_TARGET_PREFIX}.${guestUserId}`;
    window.localStorage.setItem(
      targetStorageKey,
      JSON.stringify(packageDailyTargetById),
    );
  }, [isGuestMode, guestUserId, packageDailyTargetById]);

  useEffect(() => {
    const loadProgressState = async () => {
      if (!activeUserId) {
        setReviewedVerseKeys(new Set());
        setNewVerseKeysToday(new Set());
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

      allRows.forEach((row) => {
        const verseKey = toVerseKey(row.surahNumber, row.ayahNumber);
        reviewed.add(verseKey);

        if (row.updatedAt >= startOfDay && row.repetitions <= 1) {
          newToday.add(verseKey);
        }
      });

      setReviewedVerseKeys(reviewed);
      setNewVerseKeysToday(newToday);
    };

    void loadProgressState();
  }, [activeUserId]);

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
    if (!activeUserId || !ayah) {
      return;
    }

    const currentVerseKey = toVerseKey(ayah.surahNumber, ayah.ayahNumber);
    const activePackageId = selectedPackageId;
    const activePackageStatus = activePackageId
      ? packageStatusById[activePackageId]
      : undefined;
    const activePackageTarget = activePackageId
      ? (packageDailyTargetById[activePackageId] ?? DEFAULT_DAILY_NEW_TARGET)
      : null;
    const activePackageVerseKeys = activePackageId
      ? packageVerseKeysById[activePackageId]
      : undefined;
    const isCurrentVerseInsideActivePackage = Boolean(
      activePackageVerseKeys?.has(currentVerseKey),
    );
    const isCurrentVerseNewForUser = !reviewedVerseKeys.has(currentVerseKey);

    await rateAyah({
      userId: activeUserId,
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      rating,
    });

    const nextReviewedVerseKeys = new Set(reviewedVerseKeys);
    nextReviewedVerseKeys.add(currentVerseKey);
    setReviewedVerseKeys(nextReviewedVerseKeys);

    const nextNewVerseKeysToday = new Set(newVerseKeysToday);
    if (isCurrentVerseNewForUser) {
      nextNewVerseKeysToday.add(currentVerseKey);
      setNewVerseKeysToday(nextNewVerseKeysToday);
    }

    void loadDueQueue(activeUserId);

    if (
      activePackageId &&
      activePackageStatus === "active" &&
      activePackageTarget !== null &&
      activePackageVerseKeys &&
      isCurrentVerseInsideActivePackage &&
      isCurrentVerseNewForUser
    ) {
      let newVersesTodayCount = 0;

      activePackageVerseKeys.forEach((verseKey) => {
        if (nextNewVerseKeysToday.has(verseKey)) {
          newVersesTodayCount += 1;
        }
      });

      if (newVersesTodayCount >= activePackageTarget) {
        setDailyTargetNotice(
          `${t("page.dailyLimitReached", locale)} ${activePackageTarget}.`,
        );
        return;
      }
    }

    setDailyTargetNotice(null);

    try {
      const nextAyah = await fetchNextAyah(ayah.surahNumber, ayah.ayahNumber);
      setAyah(nextAyah);
      setSelectedVerseKey(nextAyah.verseKey);
      setSelectedSurahNumber(nextAyah.surahNumber);
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
    setDailyTargetNotice(null);
    void loadAyahFromApi(nextPackage.starterVerseKey);
  };

  const handleOpenSurah = () => {
    setSelectedPackageId(null);
    setDailyTargetNotice(null);
    void loadAyahFromApi(toVerseKey(selectedSurahNumber, 1));
  };

  const updatePackageDailyTarget = async (
    packageId: string,
    direction: "decrease" | "increase",
  ) => {
    const currentTarget =
      packageDailyTargetById[packageId] ?? DEFAULT_DAILY_NEW_TARGET;
    const nextTarget =
      direction === "decrease"
        ? Math.max(0, currentTarget - 1)
        : Math.min(50, currentTarget + 1);

    if (nextTarget === currentTarget) {
      return;
    }

    setPackagesError(null);
    setPackageDailyTargetById((prev) => ({
      ...prev,
      [packageId]: nextTarget,
    }));

    if (!user?.id) {
      return;
    }

    setPackageActionId(packageId);

    try {
      await setUserPackageDailyNewTarget(user.id, packageId, nextTarget);
    } catch (updateError) {
      setPackageDailyTargetById((prev) => ({
        ...prev,
        [packageId]: currentTarget,
      }));

      const message = toUserError("PKG-UPDATE-001", updateError);
      setPackagesError(message);
    } finally {
      setPackageActionId(null);
    }
  };

  const openSourceSheet = (tab: "surah" | "packages") => {
    setSourceSheetTab(tab);
    setIsSourceSheetOpen(true);
  };

  const updatePackageStatus = async (
    packageId: string,
    status: PackageEnrollmentStatus,
  ) => {
    if (!activeUserId) {
      return;
    }

    setPackageActionId(packageId);
    setPackagesError(null);

    try {
      if (user?.id) {
        await setUserPackageEnrollmentStatus(user.id, packageId, status);
      }

      setPackageStatusById((prev) => ({
        ...prev,
        [packageId]: status,
      }));
      setPackageDailyTargetById((prev) => ({
        ...prev,
        [packageId]: prev[packageId] ?? DEFAULT_DAILY_NEW_TARGET,
      }));

      if (status === "active") {
        handleSelectPackage(packageId);
        setIsSourceSheetOpen(false);
      }
    } catch (updateError) {
      const message = toUserError("PKG-UPDATE-001", updateError);
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
    router.push("/");
  };

  useEffect(() => {
    if (!isSourceSheetOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSourceSheetOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSourceSheetOpen]);

  useEffect(() => {
    setPackagePage(1);
  }, [normalizedPackageSearch, sourceSheetTab]);

  useEffect(() => {
    if (packagePage > packagePageCount) {
      setPackagePage(packagePageCount);
    }
  }, [packagePage, packagePageCount]);

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

  if (!guestUserId && !user && (isLoading || !isInitialized)) {
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
                    {t("page.guestMode", locale)}{" "}
                    <span className="font-medium text-emerald-950 dark:text-emerald-100">
                      ({t("page.localOnly", locale)})
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
              aria-label={t("common.light", locale)}
              title={t("common.light", locale)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                theme === "light"
                  ? "border-emerald-900 bg-emerald-900 text-white dark:border-emerald-100"
                  : "border-emerald-900/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m4.93 19.07 1.41-1.41" />
                <path d="m17.66 6.34 1.41-1.41" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-label={t("common.dark", locale)}
              title={t("common.dark", locale)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                theme === "dark"
                  ? "border-emerald-900 bg-emerald-900 text-white dark:border-emerald-100"
                  : "border-emerald-900/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsInfoModalOpen(true)}
              aria-label={t("page.openInfoCenter", locale)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 10v6" />
                <path d="M12 7h.01" />
              </svg>
            </button>
            {isGuestMode ? (
              <button
                type="button"
                onClick={() => {
                  router.push("/login?auth=1");
                }}
                className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-900/30 dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
              >
                {t("auth.signIn", locale)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleSignOut();
                }}
                className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-900/30 dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
              >
                {t("auth.signOut", locale)}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-4">
        <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{t("page.practice", locale)}</p>
              <p className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
                {t("page.activeSource", locale)}:{" "}
                {selectedPackageId
                  ? (packages.find((item) => item.id === selectedPackageId)
                      ?.title ?? getSurahName(selectedSurahNumber))
                  : getSurahName(selectedSurahNumber)}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                openSourceSheet(selectedPackageId ? "packages" : "surah")
              }
              className="rounded-full border border-emerald-900/15 bg-emerald-900/5 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
            >
              {t("page.chooseSource", locale)}
            </button>
          </div>
        </div>

        <MethodologySection locale={locale} />

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

        <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-5 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{t("page.dueReviews", locale)}</p>
              <p className="text-emerald-900/70 dark:text-emerald-200/80">
                {isQueueLoading
                  ? t("page.loadingDueQueue", locale)
                  : `${visibleDueQueue.length} ${
                      visibleDueQueue.length === 1
                        ? t("page.ayahDueSingular", locale)
                        : t("page.ayahDuePlural", locale)
                    }`}
              </p>
              <p className="mt-1 text-xs text-emerald-800/70 dark:text-emerald-200/70">
                {t("page.nextReviewAuto", locale)}
              </p>
              {selectedPackageId ? (
                <p className="mt-1 text-xs text-emerald-800/70 dark:text-emerald-200/70">
                  {t("page.showingPackageDue", locale)}
                </p>
              ) : null}
              {dailyTargetNotice ? (
                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {dailyTargetNotice}
                </p>
              ) : null}
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

          {visibleDueQueue.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {visibleDueQueue.map((item) => {
                const verseKey = toVerseKey(item.surahNumber, item.ayahNumber);
                const isSelected = selectedVerseKey === verseKey;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleStartDueReview(verseKey);
                    }}
                    className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
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
      </div>

      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        locale={locale}
        onClose={() => {
          setIsOnboardingModalOpen(false);
          dismissOnboardingModal();
        }}
      />

      <InfoModal
        activeTab={activeInfoTab}
        isOpen={isInfoModalOpen}
        locale={locale}
        onClose={() => setIsInfoModalOpen(false)}
        onSelectTab={setActiveInfoTab}
      />

      {isSourceSheetOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end bg-emerald-950/50 p-3 backdrop-blur-sm"
          role="presentation"
          onClick={() => setIsSourceSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("page.sourceSheetTitle", locale)}
            className="w-full rounded-[24px] border border-emerald-900/15 bg-white p-4 text-emerald-950 shadow-[0_24px_80px_-40px_rgba(6,78,59,0.65)] dark:border-emerald-100/15 dark:bg-emerald-950 dark:text-emerald-100"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">
                {t("page.sourceSheetTitle", locale)}
              </p>
              <button
                type="button"
                onClick={() => setIsSourceSheetOpen(false)}
                className="rounded-full border border-emerald-900/15 bg-emerald-900/5 px-3 py-1 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
              >
                {t("page.closeModal", locale)}
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setSourceSheetTab("surah")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sourceSheetTab === "surah"
                    ? "bg-emerald-900 text-white"
                    : "border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100"
                }`}
              >
                {t("page.chooseSurah", locale)}
              </button>
              <button
                type="button"
                onClick={() => setSourceSheetTab("packages")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sourceSheetTab === "packages"
                    ? "bg-emerald-900 text-white"
                    : "border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100"
                }`}
              >
                {t("page.learningPackages", locale)}
              </button>
            </div>

            {sourceSheetTab === "surah" ? (
              <div className="mt-4 space-y-3">
                <input
                  type="search"
                  value={surahSearch}
                  onChange={(event) => setSurahSearch(event.target.value)}
                  placeholder={t("page.searchSurah", locale)}
                  className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="flex-1">
                    <span className="sr-only">
                      {t("page.chooseSurah", locale)}
                    </span>
                    <select
                      value={selectedSurahNumber}
                      onChange={(event) => {
                        setSelectedSurahNumber(Number(event.target.value));
                      }}
                      className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
                    >
                      {filteredSurahOptions.map((option) => (
                        <option
                          key={option.surahNumber}
                          value={option.surahNumber}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenSurah();
                      setIsSourceSheetOpen(false);
                    }}
                    className="rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                  >
                    {t("page.openSurah", locale)}
                  </button>
                </div>

                {filteredSurahOptions.length === 0 ? (
                  <p className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
                    {t("page.noSurahMatch", locale)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {sourceSheetTab === "packages" ? (
              <div className="mt-4 space-y-3">
                <input
                  type="search"
                  value={packageSearch}
                  onChange={(event) => setPackageSearch(event.target.value)}
                  placeholder={t("page.searchPackage", locale)}
                  className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
                />

                {isGuestMode ? (
                  <p className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
                    {t("page.guestPackageStatusNote", locale)}
                  </p>
                ) : null}

                {packagesError ? (
                  <div className="rounded-xl border border-rose-700/30 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
                    {packagesError}
                  </div>
                ) : null}

                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {paginatedPackages.map((item) => {
                    const isSelected = item.id === selectedPackageId;
                    const status = packageStatusById[item.id];
                    const dailyTarget =
                      packageDailyTargetById[item.id] ??
                      DEFAULT_DAILY_NEW_TARGET;
                    const packageProgress = packageProgressById[item.id] ?? {
                      totalVerses: 0,
                      reviewedVerses: 0,
                      progressPercent: 0,
                    };
                    const isBusy = packageActionId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                          isSelected
                            ? "border-emerald-900 bg-emerald-900 text-white shadow-md"
                            : "border-emerald-900/25 bg-white text-emerald-900 dark:border-emerald-200/15 dark:bg-emerald-950/45 dark:text-emerald-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectPackage(item.id);
                            setIsSourceSheetOpen(false);
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
                              isSelected
                                ? "text-emerald-50"
                                : "text-emerald-800"
                            }`}
                          >
                            {t("page.status", locale)}: {statusLabel(status)}
                          </p>
                          <p
                            className={`mt-1 ${
                              isSelected
                                ? "text-emerald-50/90"
                                : "text-emerald-900/70"
                            }`}
                          >
                            {t("page.progress", locale)}:{" "}
                            {packageProgress.progressPercent}% ({" "}
                            {packageProgress.reviewedVerses}/{" "}
                            {packageProgress.totalVerses})
                          </p>
                          <p
                            className={`mt-1 ${
                              isSelected
                                ? "text-emerald-50/90"
                                : "text-emerald-900/70"
                            }`}
                          >
                            {t("page.dailyNewTarget", locale)}: {dailyTarget}
                          </p>
                        </button>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <div className="flex items-center gap-1 rounded-md border border-emerald-900/20 px-1.5 py-1 dark:border-emerald-100/20">
                            <button
                              type="button"
                              disabled={isBusy || dailyTarget <= 0}
                              aria-label={t("page.targetDecrease", locale)}
                              onClick={() => {
                                void updatePackageDailyTarget(
                                  item.id,
                                  "decrease",
                                );
                              }}
                              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                isSelected
                                  ? "bg-white/10 text-white hover:bg-white/20"
                                  : "bg-emerald-900/15 text-emerald-900 hover:bg-emerald-900/25"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              -
                            </button>
                            <span
                              className={`min-w-8 text-center text-[11px] font-semibold ${
                                isSelected
                                  ? "text-emerald-50"
                                  : "text-emerald-900 dark:text-emerald-100"
                              }`}
                            >
                              {dailyTarget}
                            </span>
                            <button
                              type="button"
                              disabled={isBusy || dailyTarget >= 50}
                              aria-label={t("page.targetIncrease", locale)}
                              onClick={() => {
                                void updatePackageDailyTarget(
                                  item.id,
                                  "increase",
                                );
                              }}
                              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                isSelected
                                  ? "bg-white/10 text-white hover:bg-white/20"
                                  : "bg-emerald-900/15 text-emerald-900 hover:bg-emerald-900/25"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              +
                            </button>
                          </div>
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

                  {filteredPackages.length === 0 && !packagesError ? (
                    <div className="rounded-lg border border-emerald-900/25 bg-white p-3 text-emerald-900/70 dark:border-emerald-200/25 dark:bg-emerald-900/40 dark:text-emerald-200/80">
                      {normalizedPackageSearch
                        ? t("page.noPackageMatch", locale)
                        : t("page.noPublishedPackages", locale)}
                    </div>
                  ) : null}
                </div>

                {filteredPackages.length > 0 ? (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <p className="text-emerald-900/75 dark:text-emerald-200/75">
                      {t("page.page", locale)} {packagePage}{" "}
                      {t("page.of", locale)} {packagePageCount}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={packagePage <= 1}
                        onClick={() =>
                          setPackagePage((current) => Math.max(1, current - 1))
                        }
                        className="rounded-md border border-emerald-900/15 bg-emerald-900/5 px-2.5 py-1 font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
                      >
                        {t("page.prev", locale)}
                      </button>
                      <button
                        type="button"
                        disabled={packagePage >= packagePageCount}
                        onClick={() =>
                          setPackagePage((current) =>
                            Math.min(packagePageCount, current + 1),
                          )
                        }
                        className="rounded-md border border-emerald-900/15 bg-emerald-900/5 px-2.5 py-1 font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
                      >
                        {t("page.next", locale)}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
