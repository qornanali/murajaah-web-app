"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import InfoModal, { type InfoTab } from "@/components/ui/InfoModal";
import MethodologyModal from "@/components/ui/MethodologyModal";
import OnboardingModal from "@/components/ui/OnboardingModal";
import { ActiveTracksSection } from "@/components/home/ActiveTracksSection";
import { HeaderBar } from "@/components/home/HeaderBar";
import { PracticeSection } from "@/components/home/PracticeSection";
import { StatsSection } from "@/components/home/StatsSection";
import { SourceSheet } from "@/components/home/SourceSheet";
import { type AyahCardData } from "@/components/quran/AyahCard";
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
import { estimateRevealDurationSeconds } from "@/lib/quranUtils";
import { type SM2Rating } from "@/lib/srs";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { useReviewStore, type SurahMastery } from "@/store/reviewStore";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";

const defaultVerseKey = "1:1";
const TOTAL_SURAHS = 114;
const PACKAGE_PAGE_SIZE = 6;
const GUEST_PACKAGE_STATUS_PREFIX = "murajaah.guest.packageStatus";
const GUEST_PACKAGE_TARGET_PREFIX = "murajaah.guest.packageTarget";
const DEFAULT_DAILY_NEW_TARGET = 3;

const AUTO_REVEAL_RATINGS: ReadonlySet<SM2Rating> = new Set([1, 2]);

interface PostRatingRevealState {
  verseKey: string;
  rating: SM2Rating;
  totalSeconds: number;
  remainingSeconds: number;
  expiresAt: number;
  sessionId: number;
}

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
  const sessionRelearnQueue = useReviewStore(
    (state) => state.sessionRelearnQueue,
  );
  const isQueueLoading = useReviewStore((state) => state.isQueueLoading);
  const isSaving = useReviewStore((state) => state.isSaving);
  const error = useReviewStore((state) => state.error);
  const rateAyah = useReviewStore((state) => state.rateAyah);
  const enqueueSessionRelearn = useReviewStore(
    (state) => state.enqueueSessionRelearn,
  );
  const resolveSessionRelearn = useReviewStore(
    (state) => state.resolveSessionRelearn,
  );
  const clearSessionRelearn = useReviewStore(
    (state) => state.clearSessionRelearn,
  );
  const loadDueQueue = useReviewStore((state) => state.loadDueQueue);
  const loadAyahProgress = useReviewStore((state) => state.loadAyahProgress);
  const calculateSurahMastery = useReviewStore(
    (state) => state.calculateSurahMastery,
  );

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
  const [averageEaseFactor, setAverageEaseFactor] = useState<number | null>(
    null,
  );
  const [dailyTargetNotice, setDailyTargetNotice] = useState<string | null>(
    null,
  );
  const [packageActionId, setPackageActionId] = useState<string | null>(null);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(1);
  const [activeSurahTrackNumbers, setActiveSurahTrackNumbers] = useState<number[]>([1]);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab>("source");
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState(false);
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);
  const [sourceSheetTab, setSourceSheetTab] = useState<"surah" | "packages">(
    "surah",
  );
  const [surahSearch, setSurahSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [packagePage, setPackagePage] = useState(1);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [surahMasteryData, setSurahMasteryData] = useState<
    Record<string, Record<number, SurahMastery>>
  >({});
  const [completedSurahNumber, setCompletedSurahNumber] = useState<
    number | null
  >(null);
  const [postRatingReveal, setPostRatingReveal] =
    useState<PostRatingRevealState | null>(null);

  const [sessionNewAyahBaseline, setSessionNewAyahBaseline] = useState(0);
  const postRatingRevealFinalizingRef = useRef(false);
  const BREAK_THRESHOLD = 10;
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

  const activeRelearnIndex = useMemo(
    () =>
      sessionRelearnQueue.findIndex(
        (item) => item.verseKey === selectedVerseKey,
      ),
    [selectedVerseKey, sessionRelearnQueue],
  );

  const activeRelearnItem = useMemo(
    () =>
      activeRelearnIndex >= 0 ? sessionRelearnQueue[activeRelearnIndex] : null,
    [activeRelearnIndex, sessionRelearnQueue],
  );

  const activePackagesCount = useMemo(
    () =>
      Object.values(packageStatusById).filter((status) => status === "active")
        .length,
    [packageStatusById],
  );

  const completedPackagesCount = useMemo(
    () =>
      Object.values(packageStatusById).filter(
        (status) => status === "completed",
      ).length,
    [packageStatusById],
  );

  const activeTracks = useMemo(() => {
    const packageTracks = packages
      .filter((item) => packageStatusById[item.id] === "active")
      .map((item) => {
        const snapshot = packageProgressById[item.id] ?? {
          totalVerses: 0,
          reviewedVerses: 0,
          progressPercent: 0,
        };

        return {
          id: `package:${item.id}`,
          kind: "package" as const,
          title: item.title,
          subtitle: item.description,
          progressPercent: snapshot.progressPercent,
          reviewedVerses: snapshot.reviewedVerses,
          totalVerses: snapshot.totalVerses,
          isSelected: selectedPackageId === item.id,
          isBusy: packageActionId === item.id,
        };
      });

    const surahTracks = activeSurahTrackNumbers.map((surahNumber) => {
      const surahTrackPackage: MemorizationPackage = {
        id: `surah-track:${surahNumber}`,
        title: getSurahName(surahNumber),
        description: "",
        category: "surah",
        starterVerseKey: toVerseKey(surahNumber, 1),
        selector: {
          type: "surah",
          surahNumber,
        },
      };
      const snapshot = getPackageProgressSnapshot(
        surahTrackPackage,
        reviewedVerseKeys,
      );

      return {
        id: `surah:${surahNumber}`,
        kind: "surah" as const,
        title: getSurahName(surahNumber),
        subtitle: `${t("quran.surah", locale)} ${surahNumber}`,
        progressPercent: snapshot.progressPercent,
        reviewedVerses: snapshot.reviewedVerses,
        totalVerses: snapshot.totalVerses,
        isSelected: !selectedPackageId && selectedSurahNumber === surahNumber,
        isBusy: false,
      };
    });

    return [...surahTracks, ...packageTracks];
  }, [
    activeSurahTrackNumbers,
    locale,
    packageActionId,
    packageProgressById,
    packageStatusById,
    packages,
    reviewedVerseKeys,
    selectedPackageId,
    selectedSurahNumber,
  ]);

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
        clearSessionRelearn();
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
      setSessionNewAyahBaseline(newToday.size);
      setAverageEaseFactor(
        allRows.length > 0
          ? Number(
              (
                allRows.reduce((sum, row) => sum + row.easeFactor, 0) /
                allRows.length
              ).toFixed(2),
            )
          : null,
      );
    };

    void loadProgressState();
  }, [activeUserId, clearSessionRelearn]);

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

  useEffect(() => {
    if (!activeUserId || packages.length === 0) {
      return;
    }

    const calculateAllMastery = async () => {
      const masteryByPackageId: Record<
        string,
        Record<number, SurahMastery>
      > = {};

      for (const pkg of packages) {
        const verseKeys = getPackageVerseKeys(pkg);
        const surahSet = new Set<number>();

        verseKeys.forEach((key) => {
          const [surah] = key.split(":").map(Number);
          surahSet.add(surah);
        });

        masteryByPackageId[pkg.id] = {};

        for (const surahNumber of surahSet) {
          const mastery = await calculateSurahMastery(
            activeUserId,
            surahNumber,
            300,
          );
          masteryByPackageId[pkg.id][surahNumber] = mastery;
        }
      }

      setSurahMasteryData(masteryByPackageId);
    };

    void calculateAllMastery();
  }, [activeUserId, packages, calculateSurahMastery]);

  useEffect(() => {
    if (!ayah || !selectedPackageId || !surahMasteryData[selectedPackageId]) {
      setCompletedSurahNumber(null);
      return;
    }

    const surahMastery = surahMasteryData[selectedPackageId][ayah.surahNumber];
    if (
      surahMastery &&
      surahMastery.forwardMastery &&
      surahMastery.randomMastery
    ) {
      setCompletedSurahNumber(ayah.surahNumber);
    } else {
      setCompletedSurahNumber(null);
    }
  }, [ayah, selectedPackageId, surahMasteryData]);

  const commitRatingAndAdvance = useCallback(
    async (rating: SM2Rating, ayahToRate: AyahCardData) => {
      if (!activeUserId) {
        return;
      }

      const currentVerseKey = toVerseKey(
        ayahToRate.surahNumber,
        ayahToRate.ayahNumber,
      );
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
      const isCurrentVerseInRelearning = sessionRelearnQueue.some(
        (item) => item.verseKey === currentVerseKey,
      );

      await rateAyah({
        userId: activeUserId,
        surahNumber: ayahToRate.surahNumber,
        ayahNumber: ayahToRate.ayahNumber,
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

      let nextSessionRelearnQueue = sessionRelearnQueue;

      if (rating <= 2) {
        nextSessionRelearnQueue = enqueueSessionRelearn({
          surahNumber: ayahToRate.surahNumber,
          ayahNumber: ayahToRate.ayahNumber,
          rating,
        });
      } else if (isCurrentVerseInRelearning) {
        nextSessionRelearnQueue = resolveSessionRelearn(currentVerseKey);
      }

      let nextDailyTargetNotice: string | null = null;

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
          nextDailyTargetNotice = `${t("page.dailyLimitReached", locale)} ${activePackageTarget}.`;
        }
      }

      setDailyTargetNotice(nextDailyTargetNotice);

      const nextRelearnItem = nextSessionRelearnQueue[0] ?? null;

      if (nextRelearnItem) {
        await loadAyahFromApi(nextRelearnItem.verseKey);
        return;
      }

      if (nextDailyTargetNotice) {
        return;
      }

      try {
        const nextAyah = await fetchNextAyah(
          ayahToRate.surahNumber,
          ayahToRate.ayahNumber,
        );
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
    },
    [
      activeUserId,
      enqueueSessionRelearn,
      loadAyahFromApi,
      loadAyahProgress,
      loadDueQueue,
      locale,
      newVerseKeysToday,
      packageDailyTargetById,
      packageStatusById,
      packageVerseKeysById,
      rateAyah,
      resolveSessionRelearn,
      reviewedVerseKeys,
      selectedPackageId,
      sessionRelearnQueue,
    ],
  );

  const clearPostRatingReveal = () => {
    setPostRatingReveal(null);
    postRatingRevealFinalizingRef.current = false;
  };

  const handleRate = async (rating: SM2Rating) => {
    if (!activeUserId || !ayah || isSaving || postRatingReveal) {
      return;
    }

    const currentVerseKey = toVerseKey(ayah.surahNumber, ayah.ayahNumber);

    if (AUTO_REVEAL_RATINGS.has(rating)) {
      const totalSeconds = estimateRevealDurationSeconds(ayah.textUthmani);
      const now = Date.now();

      setPostRatingReveal({
        verseKey: currentVerseKey,
        rating,
        totalSeconds,
        remainingSeconds: totalSeconds,
        expiresAt: now + totalSeconds * 1000,
        sessionId: now,
      });
      return;
    }

    await commitRatingAndAdvance(rating, ayah);
  };

  const handleForceSkipPostRatingReveal = () => {
    if (postRatingRevealFinalizingRef.current) {
      return;
    }

    clearPostRatingReveal();
  };

  useEffect(() => {
    if (!postRatingReveal || !ayah) {
      return;
    }

    const revealSessionId = postRatingReveal.sessionId;
    const revealVerseKey = postRatingReveal.verseKey;
    const revealRating = postRatingReveal.rating;
    const revealExpiresAt = postRatingReveal.expiresAt;
    const revealAyah = ayah;

    const currentVerseKey = toVerseKey(
      revealAyah.surahNumber,
      revealAyah.ayahNumber,
    );

    if (currentVerseKey !== revealVerseKey) {
      setPostRatingReveal((previous) =>
        previous?.sessionId === revealSessionId ? null : previous,
      );
      postRatingRevealFinalizingRef.current = false;
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((revealExpiresAt - Date.now()) / 1000));

      setPostRatingReveal((previous) =>
        !previous || previous.sessionId !== revealSessionId
          ? previous
          : previous.remainingSeconds === remaining
            ? previous
            : { ...previous, remainingSeconds: remaining },
      );

      if (remaining > 0) {
        return;
      }

      window.clearInterval(intervalId);

      if (postRatingRevealFinalizingRef.current) {
        return;
      }

      const snapshotVerseKey = toVerseKey(
        revealAyah.surahNumber,
        revealAyah.ayahNumber,
      );

      if (snapshotVerseKey !== revealVerseKey) {
        setPostRatingReveal((previous) =>
          previous?.sessionId === revealSessionId ? null : previous,
        );
        postRatingRevealFinalizingRef.current = false;
        return;
      }

      postRatingRevealFinalizingRef.current = true;
      setPostRatingReveal((previous) =>
        previous?.sessionId === revealSessionId ? null : previous,
      );

      void commitRatingAndAdvance(revealRating, revealAyah).finally(() => {
        postRatingRevealFinalizingRef.current = false;
      });
    };

    const intervalId = window.setInterval(tick, 250);
    tick();

    return () => {
      window.clearInterval(intervalId);
    };
  }, [ayah, commitRatingAndAdvance, postRatingReveal]);

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

  const registerSurahTrack = useCallback((surahNumber: number) => {
    setActiveSurahTrackNumbers((previous) => {
      if (previous.includes(surahNumber)) {
        return previous;
      }

      return [surahNumber, ...previous].slice(0, 24);
    });
  }, []);

  const handleOpenSurah = () => {
    registerSurahTrack(selectedSurahNumber);
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

  const handleSurahCompletionRest = () => {
    setCompletedSurahNumber(null);
    setAyah(null);
  };

  const handleSurahCompletionNext = async () => {
    if (!activeUserId || !selectedPackageId || !ayah) {
      return;
    }

    setCompletedSurahNumber(null);

    const activeSurah = ayah.surahNumber;
    const nextSurahNumber = activeSurah + 1;

    if (nextSurahNumber > 114) {
      void loadAyahFromApi(defaultVerseKey);
      return;
    }

    void loadAyahFromApi(`${nextSurahNumber}:1`);
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

  const handlePlayTrack = (track: (typeof activeTracks)[number]) => {
    if (track.kind === "package") {
      const packageId = track.id.replace("package:", "");
      handleSelectPackage(packageId);
      return;
    }

    const surahNumber = Number.parseInt(track.id.replace("surah:", ""), 10);

    if (!Number.isInteger(surahNumber)) {
      return;
    }

    registerSurahTrack(surahNumber);
    setSelectedPackageId(null);
    setSelectedSurahNumber(surahNumber);
    setDailyTargetNotice(null);
    void loadAyahFromApi(toVerseKey(surahNumber, 1));
  };

  const handleResetTrack = (track: (typeof activeTracks)[number]) => {
    if (track.kind === "package") {
      const packageId = track.id.replace("package:", "");
      void updatePackageStatus(packageId, "paused");

      if (selectedPackageId === packageId) {
        setSelectedPackageId(null);
      }

      return;
    }

    const surahNumber = Number.parseInt(track.id.replace("surah:", ""), 10);

    if (!Number.isInteger(surahNumber)) {
      return;
    }

    setActiveSurahTrackNumbers((previous) => {
      const nextTracks = previous.filter((item) => item !== surahNumber);

      if (!selectedPackageId && selectedSurahNumber === surahNumber) {
        const fallbackSurah = nextTracks[0] ?? 1;
        setSelectedSurahNumber(fallbackSurah);
        setDailyTargetNotice(null);
        void loadAyahFromApi(toVerseKey(fallbackSurah, 1));
      }

      return nextTracks;
    });
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

  const sessionNewAyahsCleared =
    newVerseKeysToday.size - sessionNewAyahBaseline;
  const shouldShowBreak = sessionNewAyahsCleared >= BREAK_THRESHOLD;
  const hasCompletedSurah =
    Boolean(completedSurahNumber) &&
    Boolean(selectedPackageId) &&
    Boolean(
      selectedPackageId &&
        completedSurahNumber &&
        surahMasteryData[selectedPackageId]?.[completedSurahNumber],
    );

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
      <HeaderBar
        locale={locale}
        theme={theme}
        isGuestMode={isGuestMode}
        userEmail={user?.email}
        onSetLocale={setLocale}
        onSetTheme={setTheme}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <div className="w-full max-w-4xl space-y-5">
        <PracticeSection
          locale={locale}
          ayah={ayah}
          ayahLoading={ayahLoading}
          ayahError={ayahError}
          selectedPackageId={selectedPackageId}
          packages={packages}
          selectedSurahNumber={selectedSurahNumber}
          hasCompletedSurah={hasCompletedSurah}
          completedSurahNumber={completedSurahNumber}
          shouldShowBreak={shouldShowBreak}
          sessionNewAyahsCleared={sessionNewAyahsCleared}
          isSaving={isSaving}
          postRatingReveal={postRatingReveal}
          activeRelearnItem={activeRelearnItem}
          activeRelearnIndex={activeRelearnIndex}
          sessionRelearnQueueLength={sessionRelearnQueue.length}
          latestProgress={latestProgress}
          surahMasteryData={surahMasteryData}
          newVerseKeysToday={newVerseKeysToday}
          onRate={handleRate}
          onForceSkipPostRatingReveal={handleForceSkipPostRatingReveal}
          onSurahCompletionRest={handleSurahCompletionRest}
          onSurahCompletionNext={handleSurahCompletionNext}
          onResumeFromBreak={() => {
            setSessionNewAyahBaseline(newVerseKeysToday.size);
          }}
          onOpenSourceSheet={() =>
            openSourceSheet(selectedPackageId ? "packages" : "surah")
          }
          onOpenMethodologyModal={() => setIsMethodologyModalOpen(true)}
          onRetryLoadAyah={() => {
            void loadAyahFromApi(selectedVerseKey);
          }}
        />

        <ActiveTracksSection
          locale={locale}
          tracks={activeTracks}
          onAddTracks={() => openSourceSheet("packages")}
          onPlayTrack={handlePlayTrack}
          onResetTrack={handleResetTrack}
        />

        <StatsSection
          locale={locale}
          reviewedVerseKeys={reviewedVerseKeys}
          newVerseKeysToday={newVerseKeysToday}
          visibleDueQueue={visibleDueQueue}
          activePackagesCount={activePackagesCount}
          averageEaseFactor={averageEaseFactor}
          isQueueLoading={isQueueLoading}
          selectedVerseKey={selectedVerseKey}
          sessionRelearnQueueLength={sessionRelearnQueue.length}
          selectedPackageId={selectedPackageId}
          dailyTargetNotice={dailyTargetNotice}
          surahMasteryData={surahMasteryData}
          latestProgress={latestProgress}
          isSaving={isSaving}
          error={error}
          onStartDueReview={handleStartDueReview}
          onLoadFallbackAyah={() => {
            void loadAyahFromApi(defaultVerseKey);
          }}
        />
      </div>

      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        locale={locale}
        onClose={() => {
          setIsOnboardingModalOpen(false);
          dismissOnboardingModal();
        }}
      />

      <MethodologyModal
        isOpen={isMethodologyModalOpen}
        locale={locale}
        onClose={() => setIsMethodologyModalOpen(false)}
      />

      <InfoModal
        activeTab={activeInfoTab}
        isOpen={isInfoModalOpen}
        locale={locale}
        onClose={() => setIsInfoModalOpen(false)}
        onSelectTab={setActiveInfoTab}
        stats={{
          activePackagesCount,
          averageEaseFactor,
          completedPackagesCount,
          dueNowCount: visibleDueQueue.length,
          newTodayCount: newVerseKeysToday.size,
          totalReviewedVerses: reviewedVerseKeys.size,
        }}
      />

      <SourceSheet
        locale={locale}
        isOpen={isSourceSheetOpen}
        sourceSheetTab={sourceSheetTab}
        surahSearch={surahSearch}
        packageSearch={packageSearch}
        selectedSurahNumber={selectedSurahNumber}
        filteredSurahOptions={filteredSurahOptions}
        paginatedPackages={paginatedPackages}
        filteredPackagesLength={filteredPackages.length}
        packagePage={packagePage}
        packagePageCount={packagePageCount}
        selectedPackageId={selectedPackageId}
        packageStatusById={packageStatusById}
        packageDailyTargetById={packageDailyTargetById}
        packageProgressById={packageProgressById}
        packageActionId={packageActionId}
        packagesError={packagesError}
        isGuestMode={isGuestMode}
        onClose={() => setIsSourceSheetOpen(false)}
        onSetSourceSheetTab={setSourceSheetTab}
        onSetSurahSearch={setSurahSearch}
        onSetPackageSearch={setPackageSearch}
        onSetSelectedSurahNumber={setSelectedSurahNumber}
        onSetPackagePage={setPackagePage}
        onOpenSurah={() => {
          handleOpenSurah();
          setIsSourceSheetOpen(false);
        }}
        onSelectPackage={(packageId: string) => {
          handleSelectPackage(packageId);
          setIsSourceSheetOpen(false);
        }}
        onUpdatePackageDailyTarget={updatePackageDailyTarget}
        onUpdatePackageStatus={updatePackageStatus}
      />
    </main>
  );
}
