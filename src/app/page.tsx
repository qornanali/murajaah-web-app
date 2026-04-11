"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import InfoModal, { type InfoTab } from "@/components/ui/InfoModal";
import MethodologyModal from "@/components/ui/MethodologyModal";
import OnboardingModal from "@/components/ui/OnboardingModal";
import { ActiveTracksSection } from "@/components/home/ActiveTracksSection";
import { DueReviewCard } from "@/components/home/DueReviewCard";
import { HeaderBar } from "@/components/home/HeaderBar";
import { StatsSection } from "@/components/home/StatsSection";
import { SourceSheet } from "@/components/home/SourceSheet";
import { toUserError } from "@/lib/errorHandling";
import { getGuestUserId } from "@/lib/guest";
import { t } from "@/lib/i18n";
import { calculateStreakFromIsoDates } from "@/lib/streak";
import { checkUserApiConnectivity } from "@/lib/qf/userBrowser";
import {
  fetchQfSessionStatus,
  type QfSessionStatus,
} from "@/lib/qf/sessionBrowser";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  fetchPublishedMemorizationPackages,
  fetchUserPackageEnrollments,
  setUserPackageEnrollmentStatus,
} from "@/lib/packages/api";
import { resetProgressForVerseKeys } from "@/lib/progressReset";
import {
  fetchUserSurahTracks,
  addUserSurahTrack,
  removeUserSurahTrack,
} from "@/lib/surahTracks";
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
import { toVerseKey } from "@/lib/quranApi";
import { getSurahName } from "@/lib/quranMeta";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { useReviewStore, type SurahMastery } from "@/store/reviewStore";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";

const TOTAL_SURAHS = 114;
const PACKAGE_PAGE_SIZE = 6;
const GUEST_PACKAGE_STATUS_PREFIX = "murajaah.guest.packageStatus";
const GUEST_SURAH_TRACKS_PREFIX = "murajaah.guest.surahTracks";

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
  const loadDueQueue = useReviewStore((state) => state.loadDueQueue);
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

  const [packages, setPackages] = useState<MemorizationPackage[]>([]);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [packageStatusById, setPackageStatusById] = useState<
    Record<string, PackageEnrollmentStatus>
  >({});
  const [reviewedVerseKeys, setReviewedVerseKeys] = useState<Set<string>>(
    new Set(),
  );
  const [newVerseKeysToday, setNewVerseKeysToday] = useState<Set<string>>(
    new Set(),
  );
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isUserApiConnected, setIsUserApiConnected] = useState<boolean | null>(
    null,
  );
  const [averageEaseFactor, setAverageEaseFactor] = useState<number | null>(
    null,
  );
  const [packageActionId, setPackageActionId] = useState<string | null>(null);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(1);
  const [activeSurahTrackNumbers, setActiveSurahTrackNumbers] = useState<
    number[]
  >([]);
  const [confirmReset, setConfirmReset] = useState<{
    trackId: string;
    verseKeys: Set<string>;
    onConfirm: () => void;
  } | null>(null);
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
  const [qfSession, setQfSession] = useState<QfSessionStatus>({
    linked: false,
    qfUserId: null,
    appUserId: null,
  });

  const authenticatedUserId = user?.id;
  const isQfLinked = qfSession.linked;
  const activeUserId = user?.id ?? guestUserId;
  const isGuestMode = !user && !isQfLinked && Boolean(guestUserId);

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
    const loadQfSession = async () => {
      const status = await fetchQfSessionStatus();
      setQfSession(status);
    };

    void loadQfSession();
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
    const loadSurahTracks = async () => {
      if (!activeUserId) {
        return;
      }

      if (isGuestMode && guestUserId) {
        const key = `${GUEST_SURAH_TRACKS_PREFIX}.${guestUserId}`;
        const raw = window.localStorage.getItem(key);

        if (raw) {
          try {
            const parsed = JSON.parse(raw) as number[];
            if (Array.isArray(parsed)) {
              setActiveSurahTrackNumbers(parsed);
            }
          } catch {
            setActiveSurahTrackNumbers([]);
          }
        }

        return;
      }

      if (!authenticatedUserId) {
        return;
      }

      try {
        const tracks = await fetchUserSurahTracks(authenticatedUserId);
        setActiveSurahTrackNumbers(tracks);
      } catch {
        setActiveSurahTrackNumbers([]);
      }
    };

    void loadSurahTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedUserId, guestUserId]);

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
        const rawStatus = window.localStorage.getItem(statusStorageKey);

        if (!rawStatus) {
          setPackageStatusById({});
        } else {
          try {
            const parsed = JSON.parse(rawStatus) as Record<
              string,
              PackageEnrollmentStatus
            >;
            setPackageStatusById(parsed);
          } catch {
            setPackageStatusById({});
          }
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
      } catch (loadError) {
        const message = toUserError("PKG-ENROLL-001", loadError);
        setPackagesError(message);
      }
    };

    void loadEnrollments();
  }, [authenticatedUserId, guestUserId]);

  useEffect(() => {
    const loadUserApiStatus = async () => {
      if (!authenticatedUserId && !isQfLinked) {
        setIsUserApiConnected(null);
        return;
      }

      const connected = await checkUserApiConnectivity();
      setIsUserApiConnected(connected);
    };

    void loadUserApiStatus();
  }, [authenticatedUserId, isQfLinked]);

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

    const key = `${GUEST_SURAH_TRACKS_PREFIX}.${guestUserId}`;
    window.localStorage.setItem(key, JSON.stringify(activeSurahTrackNumbers));
  }, [isGuestMode, guestUserId, activeSurahTrackNumbers]);

  useEffect(() => {
    const loadProgressState = async () => {
      if (!activeUserId) {
        setReviewedVerseKeys(new Set());
        setNewVerseKeysToday(new Set());
        setCurrentStreak(0);
        setLongestStreak(0);
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
      const updatedAtDates: string[] = [];

      allRows.forEach((row) => {
        const verseKey = toVerseKey(row.surahNumber, row.ayahNumber);
        reviewed.add(verseKey);
        updatedAtDates.push(row.updatedAt);

        if (row.updatedAt >= startOfDay && row.repetitions <= 1) {
          newToday.add(verseKey);
        }
      });

      const streak = calculateStreakFromIsoDates(updatedAtDates);

      setReviewedVerseKeys(reviewed);
      setNewVerseKeysToday(newToday);
      setCurrentStreak(streak.current);
      setLongestStreak(streak.longest);
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
  }, [activeUserId, latestProgress?.updatedAt]);

  useEffect(() => {
    if (activeUserId) {
      void loadDueQueue(activeUserId);

      const stopSync = startBackgroundSync();
      return () => {
        stopSync();
      };
    }
  }, [activeUserId, loadDueQueue]);

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

  const handleStartDueReview = (verseKey: string) => {
    const [surahStr] = verseKey.split(":");
    const surahNumber = Number.parseInt(surahStr ?? "1", 10);
    router.push(`/practice/surah/${surahNumber}`);
  };

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    router.push(`/practice/package/${packageId}`);
  };

  const registerSurahTrack = useCallback(
    (surahNumber: number) => {
      setActiveSurahTrackNumbers((previous) => {
        if (previous.includes(surahNumber)) {
          return previous;
        }

        const next = [surahNumber, ...previous].slice(0, 24);

        if (user?.id) {
          void addUserSurahTrack(user.id, surahNumber);
        }

        return next;
      });
    },
    [user],
  );

  const handleOpenSurah = () => {
    registerSurahTrack(selectedSurahNumber);
    setSelectedPackageId(null);
    router.push(`/practice/surah/${selectedSurahNumber}`);
  };

  const openSourceSheet = (tab: "surah" | "packages") => {
    setSourceSheetTab(tab);
    setIsSourceSheetOpen(true);
  };

  const updatePackageStatus = async (packageId: string) => {
    if (!activeUserId) {
      return;
    }

    setPackageActionId(packageId);
    setPackagesError(null);

    try {
      if (user?.id) {
        await setUserPackageEnrollmentStatus(user.id, packageId, "active");
      }

      setPackageStatusById((prev) => ({
        ...prev,
        [packageId]: "active",
      }));

      handleSelectPackage(packageId);
      setIsSourceSheetOpen(false);
    } catch (updateError) {
      const message = toUserError("PKG-UPDATE-001", updateError);
      setPackagesError(message);
    } finally {
      setPackageActionId(null);
    }
  };

  const handlePlayTrack = (track: (typeof activeTracks)[number]) => {
    if (track.kind === "package") {
      const packageId = track.id.replace("package:", "");
      router.push(`/practice/package/${packageId}`);
      return;
    }

    const surahNumber = Number.parseInt(track.id.replace("surah:", ""), 10);

    if (!Number.isInteger(surahNumber)) {
      return;
    }

    registerSurahTrack(surahNumber);
    router.push(`/practice/surah/${surahNumber}`);
  };

  const computeOtherActiveVerseKeys = (excludeTrackId: string): Set<string> => {
    const other = new Set<string>();

    packages
      .filter(
        (pkg) =>
          packageStatusById[pkg.id] === "active" &&
          `package:${pkg.id}` !== excludeTrackId,
      )
      .forEach((pkg) => {
        getPackageVerseKeys(pkg).forEach((k) => other.add(k));
      });

    activeSurahTrackNumbers
      .filter((n) => `surah:${n}` !== excludeTrackId)
      .forEach((n) => {
        const surahPkg: MemorizationPackage = {
          id: `surah-track:${n}`,
          title: "",
          description: "",
          category: "surah",
          starterVerseKey: toVerseKey(n, 1),
          selector: { type: "surah", surahNumber: n },
        };
        getPackageVerseKeys(surahPkg).forEach((k) => other.add(k));
      });

    return other;
  };

  const doResetTrack = async (
    track: (typeof activeTracks)[number],
    verseKeys: Set<string>,
  ) => {
    if (activeUserId) {
      const otherKeys = computeOtherActiveVerseKeys(track.id);
      const exclusiveKeys = new Set(
        Array.from(verseKeys).filter((k) => !otherKeys.has(k)),
      );
      await resetProgressForVerseKeys(activeUserId, exclusiveKeys);
    }

    if (track.kind === "package") {
      const packageId = track.id.replace("package:", "");

      setPackageStatusById((prev) => {
        const next = { ...prev };
        delete next[packageId];
        return next;
      });

      if (user?.id) {
        void setUserPackageEnrollmentStatus(user.id, packageId, "paused");
      }

      if (selectedPackageId === packageId) {
        setSelectedPackageId(null);
      }
    } else {
      const surahNumber = Number.parseInt(track.id.replace("surah:", ""), 10);

      if (!Number.isInteger(surahNumber)) {
        return;
      }

      setActiveSurahTrackNumbers((previous) =>
        previous.filter((item) => item !== surahNumber),
      );

      if (user?.id) {
        void removeUserSurahTrack(user.id, surahNumber);
      }
    }

    if (activeUserId) {
      void loadDueQueue(activeUserId);

      const allRows = await murajaahDB.ayahProgress
        .toCollection()
        .filter((row) => row.userId === activeUserId)
        .toArray();

      const reviewed = new Set<string>();
      allRows.forEach((row) => {
        reviewed.add(toVerseKey(row.surahNumber, row.ayahNumber));
      });
      setReviewedVerseKeys(reviewed);
    }
  };

  const handleResetTrack = (track: (typeof activeTracks)[number]) => {
    let trackVerseKeys: Set<string>;

    if (track.kind === "package") {
      const packageId = track.id.replace("package:", "");
      const pkg = packages.find((p) => p.id === packageId);
      trackVerseKeys = pkg ? getPackageVerseKeys(pkg) : new Set();
    } else {
      const surahNumber = Number.parseInt(track.id.replace("surah:", ""), 10);
      const surahPkg: MemorizationPackage = {
        id: `surah-track:${surahNumber}`,
        title: "",
        description: "",
        category: "surah",
        starterVerseKey: toVerseKey(surahNumber, 1),
        selector: { type: "surah", surahNumber },
      };
      trackVerseKeys = getPackageVerseKeys(surahPkg);
    }

    setConfirmReset({
      trackId: track.id,
      verseKeys: trackVerseKeys,
      onConfirm: () => {
        setConfirmReset(null);
        void doResetTrack(track, trackVerseKeys);
      },
    });
  };

  const handleSignOut = async () => {
    if (user) {
      await signOut();
    } else {
      await fetch("/api/user/oauth/logout", {
        method: "POST",
      });
      setQfSession({ linked: false, qfUserId: null, appUserId: null });
      setIsUserApiConnected(null);
    }

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
        userEmail={user?.email ?? qfSession.qfUserId ?? undefined}
        onSetLocale={setLocale}
        onSetTheme={setTheme}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
        onOpenMethodologyModal={() => setIsMethodologyModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <div className="w-full max-w-4xl space-y-5">
        <DueReviewCard
          locale={locale}
          dueCount={dueQueue.length}
          isLoading={isQueueLoading}
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
          isUserApiConnected={isUserApiConnected}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          visibleDueQueue={visibleDueQueue}
          activePackagesCount={activePackagesCount}
          averageEaseFactor={averageEaseFactor}
          isQueueLoading={isQueueLoading}
          selectedVerseKey=""
          sessionRelearnQueueLength={sessionRelearnQueue.length}
          selectedPackageId={selectedPackageId}
          dailyTargetNotice={null}
          surahMasteryData={surahMasteryData}
          latestProgress={latestProgress}
          isSaving={isSaving}
          error={error}
          onStartDueReview={handleStartDueReview}
          onLoadFallbackAyah={() => {
            void loadDueQueue(activeUserId ?? "");
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

      <ConfirmDialog
        isOpen={confirmReset !== null}
        title="Remove track & reset progress?"
        body={(() => {
          if (!confirmReset) return "";
          const otherKeys = computeOtherActiveVerseKeys(confirmReset.trackId);
          const exclusiveCount = Array.from(confirmReset.verseKeys).filter(
            (k) => !otherKeys.has(k),
          ).length;
          return exclusiveCount > 0
            ? `This will permanently delete memorization progress for ${exclusiveCount} verse${
                exclusiveCount === 1 ? "" : "s"
              } not shared with other active tracks.`
            : "No verse progress will be deleted since all verses overlap with another active track.";
        })()}
        confirmLabel="Remove & Reset"
        onConfirm={() => confirmReset?.onConfirm()}
        onCancel={() => setConfirmReset(null)}
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
        onStartPackage={updatePackageStatus}
      />
    </main>
  );
}
