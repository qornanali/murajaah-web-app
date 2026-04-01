"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, BookOpen } from "lucide-react";

import { getGuestUserId } from "@/lib/guest";
import { t } from "@/lib/i18n";
import { fetchAyahByKey, toVerseKey } from "@/lib/quranApi";
import { getSurahName } from "@/lib/quranMeta";
import { estimateRevealDurationSeconds, splitAyahByWaqf } from "@/lib/quranUtils";
import { PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { fetchPublishedMemorizationPackages } from "@/lib/packages/api";
import { getPackageVerseKeys } from "@/lib/packages/progress";
import { type MemorizationPackage } from "@/lib/packages/types";
import { calculateSM2, type SM2Rating } from "@/lib/srs";
import { toUserError } from "@/lib/errorHandling";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { useReviewStore } from "@/store/reviewStore";
import { type AyahCardData } from "@/components/quran/AyahCard";

interface PracticeSessionProps {
  kind: string;
  id: string;
}

interface PostRatingReveal {
  verseKey: string;
  rating: SM2Rating;
  totalSeconds: number;
  remainingSeconds: number;
  expiresAt: number;
  sessionId: number;
}

const AUTO_REVEAL_RATINGS: ReadonlySet<SM2Rating> = new Set([1, 2]);

const ratingButtons: Array<{
  labelKey: string;
  value: SM2Rating;
  colorClasses: string;
  bgLight: string;
}> = [
  { labelKey: "rating.again", value: 1, colorClasses: "bg-rose-700 hover:bg-rose-800 active:bg-rose-900", bgLight: "bg-rose-50 dark:bg-rose-950/30" },
  { labelKey: "rating.hard", value: 2, colorClasses: "bg-amber-700 hover:bg-amber-800 active:bg-amber-900", bgLight: "bg-amber-50 dark:bg-amber-950/30" },
  { labelKey: "rating.good", value: 3, colorClasses: "bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900", bgLight: "bg-emerald-50 dark:bg-emerald-950/30" },
  { labelKey: "rating.easy", value: 4, colorClasses: "bg-teal-700 hover:bg-teal-800 active:bg-teal-900", bgLight: "bg-teal-50 dark:bg-teal-950/30" },
];

function buildSessionQueue(
  dueQueue: ReturnType<typeof useReviewStore.getState>["dueQueue"],
  trackVerseKeys: Set<string> | null,
): string[] {
  const filtered = trackVerseKeys
    ? dueQueue.filter((row) => trackVerseKeys.has(toVerseKey(row.surahNumber, row.ayahNumber)))
    : dueQueue;

  return filtered.map((row) => toVerseKey(row.surahNumber, row.ayahNumber));
}

function getTrackVerseKeys(
  kind: string,
  id: string,
  packages: MemorizationPackage[],
): Set<string> | null {
  if (kind === "all") return null;

  if (kind === "surah") {
    const surahNumber = Number.parseInt(id, 10);
    if (!Number.isInteger(surahNumber)) return null;
    const pkg: MemorizationPackage = {
      id: `surah-${surahNumber}`,
      title: getSurahName(surahNumber),
      description: "",
      category: "surah",
      starterVerseKey: toVerseKey(surahNumber, 1),
      selector: { type: "surah", surahNumber },
    };
    return getPackageVerseKeys(pkg);
  }

  if (kind === "package") {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return new Set();
    return getPackageVerseKeys(pkg);
  }

  return null;
}

function getTrackTitle(kind: string, id: string, packages: MemorizationPackage[]): string {
  if (kind === "all") return "";
  if (kind === "surah") {
    const n = Number.parseInt(id, 10);
    return Number.isInteger(n) ? getSurahName(n) : "";
  }
  if (kind === "package") {
    return packages.find((p) => p.id === id)?.title ?? "";
  }
  return "";
}

export default function PracticeSession({ kind, id }: PracticeSessionProps) {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);

  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  const dueQueue = useReviewStore((state) => state.dueQueue);
  const sessionRelearnQueue = useReviewStore((state) => state.sessionRelearnQueue);
  const isSaving = useReviewStore((state) => state.isSaving);
  const rateAyah = useReviewStore((state) => state.rateAyah);
  const loadDueQueue = useReviewStore((state) => state.loadDueQueue);
  const loadAyahProgress = useReviewStore((state) => state.loadAyahProgress);
  const enqueueSessionRelearn = useReviewStore((state) => state.enqueueSessionRelearn);
  const resolveSessionRelearn = useReviewStore((state) => state.resolveSessionRelearn);
  const clearSessionRelearn = useReviewStore((state) => state.clearSessionRelearn);
  const latestProgress = useReviewStore((state) => state.latestProgress);

  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [packages, setPackages] = useState<MemorizationPackage[]>([]);
  const [packagesReady, setPackagesReady] = useState(false);

  const [sessionQueue, setSessionQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  const [ayah, setAyah] = useState<AyahCardData | null>(null);
  const [ayahLoading, setAyahLoading] = useState(true);
  const [ayahError, setAyahError] = useState<string | null>(null);

  const [revealLevel, setRevealLevel] = useState<0 | 1 | 2>(0);
  const [visibleChunkCount, setVisibleChunkCount] = useState(1);

  const [activeRating, setActiveRating] = useState<SM2Rating | null>(null);
  const [postRatingReveal, setPostRatingReveal] = useState<PostRatingReveal | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const postRatingRevealFinalizingRef = useRef(false);

  const activeUserId = user?.id ?? guestUserId;

  const trackVerseKeys = useMemo(
    () => (packagesReady ? getTrackVerseKeys(kind, id, packages) : null),
    [kind, id, packages, packagesReady],
  );

  const trackTitle = useMemo(
    () => (packagesReady ? getTrackTitle(kind, id, packages) : ""),
    [kind, id, packages, packagesReady],
  );

  const chunks = useMemo(
    () => (ayah ? splitAyahByWaqf(ayah.textUthmani) : []),
    [ayah],
  );

  const firstWord = useMemo(() => {
    if (!ayah) return "";
    const words = ayah.textUthmani.trim().split(/\s+/);
    return words[0] ?? "";
  }, [ayah]);

  const hasMoreChunks = visibleChunkCount < chunks.length;
  const hasPrevChunks = visibleChunkCount > 1;

  const baseEaseFactor = latestProgress?.easeFactor ?? 2.5;
  const baseInterval = latestProgress?.interval ?? 0;
  const baseRepetitions = latestProgress?.repetitions ?? 0;

  const previewCopy = useMemo(
    () =>
      locale === "id"
        ? {
            next: "Berikutnya",
            tomorrow: "besok",
            inDays: (days: number) => `${days} hari lagi`,
            repsReset: "pengulangan direset",
            repsTo: (reps: number) => `pengulangan ${reps}`,
            efTo: (ef: number) => `EF ${ef.toFixed(2)}`,
          }
        : {
            next: "Next",
            tomorrow: "tomorrow",
            inDays: (days: number) => `in ${days} days`,
            repsReset: "reps reset",
            repsTo: (reps: number) => `reps ${reps}`,
            efTo: (ef: number) => `EF ${ef.toFixed(2)}`,
          },
    [locale],
  );

  const ratingPreviews = useMemo(
    () =>
      ratingButtons.map((btn) => {
        const result = calculateSM2(btn.value, baseEaseFactor, baseInterval, baseRepetitions);
        const nextReviewText =
          result.interval <= 1 ? previewCopy.tomorrow : previewCopy.inDays(result.interval);
        const effectText =
          btn.value < 3
            ? `${previewCopy.repsReset} · ${previewCopy.efTo(result.easeFactor)}`
            : `${previewCopy.repsTo(result.repetitions)} · ${previewCopy.efTo(result.easeFactor)}`;
        return { ...btn, nextReviewText, effectText };
      }),
    [baseEaseFactor, baseInterval, baseRepetitions, previewCopy],
  );

  useEffect(() => {
    void initializeAuth();
    initializeLocale();
  }, [initializeAuth, initializeLocale]);

  useEffect(() => {
    setGuestUserId(getGuestUserId());
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const fetched = await fetchPublishedMemorizationPackages();
        setPackages(fetched);
      } catch {
        setPackages(PACKAGE_CATALOG);
      } finally {
        setPackagesReady(true);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    void loadDueQueue(activeUserId);
    clearSessionRelearn();
  }, [activeUserId, loadDueQueue, clearSessionRelearn]);

  useEffect(() => {
    if (!packagesReady || dueQueue.length === 0) return;
    const queue = buildSessionQueue(dueQueue, trackVerseKeys);
    setSessionQueue(queue);
    setQueueIndex(0);
  }, [packagesReady, dueQueue, trackVerseKeys]);

  useEffect(() => {
    if (sessionQueue.length === 0 && packagesReady && activeUserId && dueQueue.length >= 0) return;
    if (!sessionQueue[queueIndex]) return;
    void loadAyahByKey(sessionQueue[queueIndex]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionQueue, queueIndex]);

  useEffect(() => {
    setRevealLevel(0);
    setVisibleChunkCount(1);
    setActiveRating(null);
    setAutoplayBlocked(false);
  }, [ayah?.surahNumber, ayah?.ayahNumber]);

  useEffect(() => {
    if (revealLevel !== 2 || !ayah?.audioUrl || !audioRef.current) return;
    setAutoplayBlocked(false);
    void audioRef.current.play().catch(() => setAutoplayBlocked(true));
  }, [revealLevel, ayah?.audioUrl]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const loadAyahByKey = async (verseKey: string) => {
    setAyahLoading(true);
    setAyahError(null);
    try {
      const data = await fetchAyahByKey(verseKey);
      setAyah(data);
      if (activeUserId) {
        void loadAyahProgress(activeUserId, data.surahNumber, data.ayahNumber);
      }
    } catch (err) {
      setAyahError(toUserError("QURAN-AYAH-001", err));
    } finally {
      setAyahLoading(false);
    }
  };

  const advanceToNext = useCallback(
    async (rating: SM2Rating, ratedAyah: AyahCardData) => {
      if (!activeUserId) return;

      const currentVerseKey = toVerseKey(ratedAyah.surahNumber, ratedAyah.ayahNumber);
      const isInRelearning = sessionRelearnQueue.some((item) => item.verseKey === currentVerseKey);

      await rateAyah({ userId: activeUserId, surahNumber: ratedAyah.surahNumber, ayahNumber: ratedAyah.ayahNumber, rating });

      let nextRelearnQueue = sessionRelearnQueue;
      if (rating <= 2) {
        nextRelearnQueue = enqueueSessionRelearn({ surahNumber: ratedAyah.surahNumber, ayahNumber: ratedAyah.ayahNumber, rating });
      } else if (isInRelearning) {
        nextRelearnQueue = resolveSessionRelearn(currentVerseKey);
      }

      const nextRelearnItem = nextRelearnQueue[0] ?? null;
      if (nextRelearnItem) {
        await loadAyahByKey(nextRelearnItem.verseKey);
        return;
      }

      const nextIndex = queueIndex + 1;
      if (nextIndex < sessionQueue.length) {
        setQueueIndex(nextIndex);
        return;
      }

      setIsComplete(true);
      setTimeout(() => router.push("/"), 1800);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeUserId, queueIndex, sessionQueue, sessionRelearnQueue, rateAyah, enqueueSessionRelearn, resolveSessionRelearn, router],
  );

  const handleRate = (rating: SM2Rating) => {
    if (!ayah || isSaving || postRatingReveal) return;

    if (AUTO_REVEAL_RATINGS.has(rating)) {
      const totalSeconds = estimateRevealDurationSeconds(ayah.textUthmani);
      const now = Date.now();
      setPostRatingReveal({
        verseKey: toVerseKey(ayah.surahNumber, ayah.ayahNumber),
        rating,
        totalSeconds,
        remainingSeconds: totalSeconds,
        expiresAt: now + totalSeconds * 1000,
        sessionId: now,
      });
      setRevealLevel(2);
      setVisibleChunkCount(chunks.length);
      return;
    }

    const snapshotAyah = ayah;
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    setActiveRating(rating);
    feedbackTimerRef.current = window.setTimeout(() => {
      setActiveRating(null);
      feedbackTimerRef.current = null;
    }, 560);
    void advanceToNext(rating, snapshotAyah);
  };

  useEffect(() => {
    if (!postRatingReveal || !ayah) return;

    const { sessionId, expiresAt, rating, verseKey } = postRatingReveal;
    const snapshotAyah = ayah;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setPostRatingReveal((prev) =>
        !prev || prev.sessionId !== sessionId ? prev
          : prev.remainingSeconds === remaining ? prev
          : { ...prev, remainingSeconds: remaining },
      );
      if (remaining > 0) return;
      window.clearInterval(intervalId);
      if (postRatingRevealFinalizingRef.current) return;
      if (toVerseKey(snapshotAyah.surahNumber, snapshotAyah.ayahNumber) !== verseKey) {
        setPostRatingReveal((prev) => (prev?.sessionId === sessionId ? null : prev));
        return;
      }
      postRatingRevealFinalizingRef.current = true;
      setPostRatingReveal((prev) => (prev?.sessionId === sessionId ? null : prev));
      void advanceToNext(rating, snapshotAyah).finally(() => {
        postRatingRevealFinalizingRef.current = false;
      });
    };

    const intervalId = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(intervalId);
  }, [ayah, advanceToNext, postRatingReveal]);

  const handleForceSkip = () => {
    if (postRatingRevealFinalizingRef.current || !postRatingReveal || !ayah) return;
    const { rating } = postRatingReveal;
    const snapshotAyah = ayah;
    postRatingRevealFinalizingRef.current = true;
    setPostRatingReveal(null);
    void advanceToNext(rating, snapshotAyah).finally(() => {
      postRatingRevealFinalizingRef.current = false;
    });
  };

  const isQueueEmpty = packagesReady && sessionQueue.length === 0 && !ayahLoading;
  const progressLabel = sessionQueue.length > 0
    ? `${Math.min(queueIndex + 1, sessionQueue.length)}/${sessionQueue.length}`
    : null;

  const currentAyahLabel = ayah
    ? `${t("quran.surah", locale)} ${ayah.surahNumber} · ${t("quran.ayah", locale)} ${ayah.ayahNumber}`
    : null;

  const isAutoRevealActive = Boolean(postRatingReveal);
  const isRatingDisabled = isSaving || isAutoRevealActive || !ayah || isComplete;

  if (!isAuthInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FDFCF8] dark:bg-emerald-950">
        <p className="text-sm text-emerald-900/60 dark:text-emerald-100/60">{t("common.loading", locale)}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#FDFCF8] dark:bg-emerald-950">
      <header className="flex items-center gap-3 border-b border-emerald-900/10 bg-[#FDFCF8]/95 px-4 py-3 backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/95 sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label={t("practice.backToHome", locale)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 transition-all duration-200 hover:bg-emerald-900/10 active:scale-95 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          {trackTitle ? (
            <p className="truncate text-sm font-semibold text-emerald-950 dark:text-emerald-50">
              {trackTitle}
            </p>
          ) : (
            <p className="truncate text-sm font-semibold text-emerald-950 dark:text-emerald-50">
              {t("practice.dueReviewTitle", locale)}
            </p>
          )}
          {currentAyahLabel ? (
            <p className="truncate text-[11px] text-emerald-900/60 dark:text-emerald-100/60">
              {currentAyahLabel}
            </p>
          ) : null}
        </div>

        {progressLabel ? (
          <div className="flex h-8 min-w-[3rem] items-center justify-center rounded-full border border-emerald-900/20 bg-emerald-900/8 px-3 text-xs font-semibold text-emerald-900 dark:border-emerald-100/20 dark:bg-emerald-100/10 dark:text-emerald-100">
            {progressLabel}
          </div>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {isComplete ? (
          <CompletionState locale={locale} />
        ) : isQueueEmpty ? (
          <EmptyState locale={locale} onBack={() => router.push("/")} />
        ) : ayahLoading && !ayah ? (
          <LoadingState locale={locale} />
        ) : ayahError ? (
          <ErrorState
            message={ayahError}
            locale={locale}
            onRetry={() => {
              if (sessionQueue[queueIndex]) void loadAyahByKey(sessionQueue[queueIndex]);
            }}
          />
        ) : ayah ? (
          <AyahDisplay
            ayah={ayah}
            revealLevel={revealLevel}
            visibleChunkCount={visibleChunkCount}
            chunks={chunks}
            firstWord={firstWord}
            hasMoreChunks={hasMoreChunks}
            hasPrevChunks={hasPrevChunks}
            audioRef={audioRef}
            autoplayBlocked={autoplayBlocked}
            isAutoRevealActive={isAutoRevealActive}
            postRatingReveal={postRatingReveal}
            locale={locale}
            onRevealHint={() => setRevealLevel(1)}
            onRevealFull={() => {
              setRevealLevel(2);
              setVisibleChunkCount(1);
            }}
            onNextChunk={() => setVisibleChunkCount((c) => Math.min(c + 1, chunks.length))}
            onPrevChunk={() => setVisibleChunkCount((c) => Math.max(c - 1, 1))}
            onForceSkip={handleForceSkip}
          />
        ) : null}
      </div>

      {!isComplete && !isQueueEmpty && ayah && (
        <footer className="border-t border-emerald-900/10 bg-[#FDFCF8]/98 p-4 backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/98 sm:p-5">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {ratingPreviews.map((btn) => (
              <div
                key={btn.value}
                className={`rounded-2xl border border-emerald-900/8 p-1.5 transition-colors dark:border-emerald-100/8 ${btn.bgLight}`}
              >
                <button
                  type="button"
                  disabled={isRatingDisabled}
                  onClick={() => handleRate(btn.value)}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-95 ${btn.colorClasses} ${
                    activeRating === btn.value ? "scale-95 ring-2 ring-white/40 ring-offset-1" : ""
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {t(btn.labelKey, locale)}
                </button>
                <div className="mt-1.5 space-y-0.5 px-0.5 text-[10px] leading-4 text-emerald-900/70 dark:text-emerald-100/70">
                  <p><span className="font-semibold">{previewCopy.next}:</span> {btn.nextReviewText}</p>
                  <p className="truncate">{btn.effectText}</p>
                </div>
              </div>
            ))}
          </div>
        </footer>
      )}
    </main>
  );
}

function AyahDisplay({
  ayah,
  revealLevel,
  visibleChunkCount,
  chunks,
  firstWord,
  hasMoreChunks,
  hasPrevChunks,
  audioRef,
  autoplayBlocked,
  isAutoRevealActive,
  postRatingReveal,
  locale,
  onRevealHint,
  onRevealFull,
  onNextChunk,
  onPrevChunk,
  onForceSkip,
}: {
  ayah: AyahCardData;
  revealLevel: 0 | 1 | 2;
  visibleChunkCount: number;
  chunks: string[];
  firstWord: string;
  hasMoreChunks: boolean;
  hasPrevChunks: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  autoplayBlocked: boolean;
  isAutoRevealActive: boolean;
  postRatingReveal: PostRatingReveal | null;
  locale: ReturnType<typeof useLocaleStore.getState>["locale"];
  onRevealHint: () => void;
  onRevealFull: () => void;
  onNextChunk: () => void;
  onPrevChunk: () => void;
  onForceSkip: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-between px-4 py-6 sm:px-6">
      <div className="flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6">
        {revealLevel === 0 && (
          <div className="flex w-full flex-col items-center gap-6">
            <div className="w-full rounded-[24px] border border-dashed border-emerald-900/20 bg-emerald-900/4 px-6 py-12 text-center dark:border-emerald-100/20 dark:bg-emerald-100/4">
              <p className="text-base font-medium text-emerald-900/50 dark:text-emerald-100/50">
                {t("practice.reciteAyah", locale)}
              </p>
            </div>
            <button
              type="button"
              onClick={onRevealHint}
              className="rounded-2xl border border-emerald-900/20 bg-emerald-50 px-8 py-3 text-sm font-semibold text-emerald-900 transition-all duration-200 hover:bg-emerald-100 active:scale-95 dark:border-emerald-100/20 dark:bg-emerald-900/30 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
            >
              {t("practice.showHint", locale)}
            </button>
          </div>
        )}

        {revealLevel === 1 && (
          <div className="flex w-full flex-col items-center gap-6">
            <div
              className="w-full rounded-[24px] border border-emerald-900/15 bg-emerald-900/5 px-6 py-10 text-center dark:border-emerald-100/15 dark:bg-emerald-100/5"
              dir="rtl"
              lang="ar"
            >
              <p
                className="text-4xl leading-loose text-emerald-950/40 dark:text-emerald-50/40"
                style={{ fontFamily: '"Amiri", "Scheherazade New", serif' }}
              >
                {firstWord}
              </p>
            </div>
            <button
              type="button"
              onClick={onRevealFull}
              className="rounded-2xl bg-emerald-900 px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-800 active:scale-95 dark:bg-emerald-200 dark:text-emerald-950 dark:hover:bg-emerald-100"
            >
              {t("practice.showAyah", locale)}
            </button>
          </div>
        )}

        {revealLevel === 2 && (
          <div className="flex w-full flex-col gap-5">
            <section
              className="w-full rounded-[24px] border border-emerald-900/12 bg-emerald-950/5 px-5 py-7 dark:border-emerald-100/12 dark:bg-emerald-100/6"
              dir="rtl"
              lang="ar"
            >
              <p
                className="text-right text-3xl leading-[2.6] text-emerald-950 dark:text-emerald-50"
                style={{ fontFamily: '"Amiri", "Scheherazade New", serif' }}
              >
                {chunks.slice(0, visibleChunkCount).join(" ")}
              </p>
            </section>

            {chunks.length > 1 && (
              <div className="flex items-center justify-center gap-3">
                {hasPrevChunks && (
                  <button
                    type="button"
                    onClick={onPrevChunk}
                    className="rounded-xl border border-emerald-900/20 px-4 py-2 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-900/8 dark:border-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/8"
                  >
                    ← {t("practice.prevPhrase", locale)}
                  </button>
                )}
                <span className="text-xs text-emerald-900/50 dark:text-emerald-100/50">
                  {visibleChunkCount}/{chunks.length}
                </span>
                {hasMoreChunks && (
                  <button
                    type="button"
                    onClick={onNextChunk}
                    className="rounded-xl border border-emerald-900/20 px-4 py-2 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-900/8 dark:border-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/8"
                  >
                    {t("practice.nextPhrase", locale)} →
                  </button>
                )}
              </div>
            )}

            {ayah.audioUrl && (
              <div className="space-y-2">
                <audio
                  ref={audioRef}
                  className="w-full"
                  controls
                  preload="none"
                  src={ayah.audioUrl}
                >
                  {t("quran.audioNotSupported", locale)}
                </audio>
                {autoplayBlocked && (
                  <p className="text-center text-xs text-emerald-900/60 dark:text-emerald-100/60">
                    {t("quran.autoplayBlockedFallback", locale)}
                  </p>
                )}
              </div>
            )}

            {isAutoRevealActive && postRatingReveal && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-900/15 bg-emerald-900/8 px-4 py-3 dark:border-emerald-100/15 dark:bg-emerald-100/8">
                <p className="text-xs text-emerald-900 dark:text-emerald-100">
                  {t("practice.autoAdvance", locale)}{" "}
                  <span className="font-semibold">{postRatingReveal.remainingSeconds}s</span>
                </p>
                <button
                  type="button"
                  onClick={onForceSkip}
                  className="rounded-xl bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-200 dark:text-emerald-950"
                >
                  {t("practice.forceSkip", locale)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompletionState({ locale }: { locale: ReturnType<typeof useLocaleStore.getState>["locale"] }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
        <CheckCircle className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
      </div>
      <p className="text-xl font-bold text-emerald-950 dark:text-emerald-50">
        {t("practice.sessionComplete", locale)}
      </p>
      <p className="text-sm text-emerald-900/60 dark:text-emerald-100/60">
        {t("practice.sessionCompleteSubtitle", locale)}
      </p>
    </div>
  );
}

function EmptyState({
  locale,
  onBack,
}: {
  locale: ReturnType<typeof useLocaleStore.getState>["locale"];
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
        <BookOpen className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
      </div>
      <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">
        {t("practice.noReviews", locale)}
      </p>
      <p className="text-sm text-emerald-900/60 dark:text-emerald-100/60">
        {t("practice.noReviewsSubtitle", locale)}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 rounded-2xl bg-emerald-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-200 dark:text-emerald-950"
      >
        {t("practice.backToHome", locale)}
      </button>
    </div>
  );
}

function LoadingState({ locale }: { locale: ReturnType<typeof useLocaleStore.getState>["locale"] }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-emerald-900/60 dark:text-emerald-100/60">{t("common.loading", locale)}</p>
    </div>
  );
}

function ErrorState({
  message,
  locale,
  onRetry,
}: {
  message: string;
  locale: ReturnType<typeof useLocaleStore.getState>["locale"];
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-sm text-rose-700 dark:text-rose-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-2xl border border-emerald-900/20 px-5 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-900/8 dark:border-emerald-100/20 dark:text-emerald-100"
      >
        {t("common.retry", locale)}
      </button>
    </div>
  );
}
