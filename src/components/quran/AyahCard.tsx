"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { t } from "@/lib/i18n";
import { getSurahName } from "@/lib/quranMeta";
import { useLocaleStore } from "@/store/localeStore";

import { splitAyahByWaqf } from "../../lib/quranUtils";
import { calculateSM2, type SM2Rating } from "../../lib/srs";

export interface AyahCardData {
  surahNumber: number;
  ayahNumber: number;
  textUthmani: string;
  audioUrl?: string | null;
}

interface AyahCardProps {
  ayah: AyahCardData;
  onRate: (rating: SM2Rating) => void;
  isSubmitting?: boolean;
  autoRevealState?: {
    isActive: boolean;
    remainingSeconds: number;
    totalSeconds: number;
    sessionId: number;
  } | null;
  onForceSkipAutoReveal?: () => void;
  relearningState?: {
    attempt: number;
    queueSize: number;
    queuePosition: number;
  } | null;
  reviewState?: {
    easeFactor: number;
    interval: number;
    repetitions: number;
  } | null;
}

const ratingButtons: Array<{
  labelKey: string;
  value: SM2Rating;
  classes: string;
}> = [
  {
    labelKey: "rating.again",
    value: 1,
    classes: "bg-rose-700 hover:bg-rose-800",
  },
  {
    labelKey: "rating.hard",
    value: 2,
    classes: "bg-amber-700 hover:bg-amber-800",
  },
  {
    labelKey: "rating.good",
    value: 3,
    classes: "bg-emerald-700 hover:bg-emerald-800",
  },
  {
    labelKey: "rating.easy",
    value: 4,
    classes: "bg-teal-700 hover:bg-teal-800",
  },
];

export default function AyahCard({
  ayah,
  onRate,
  isSubmitting = false,
  autoRevealState = null,
  onForceSkipAutoReveal,
  relearningState = null,
  reviewState,
}: AyahCardProps) {
  const locale = useLocaleStore((state) => state.locale);
  const [revealed, setRevealed] = useState(false);
  const [visibleChunkCount, setVisibleChunkCount] = useState(1);
  const [activeRating, setActiveRating] = useState<SM2Rating | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const feedbackTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const surahName = getSurahName(ayah.surahNumber);
  const isAutoRevealActive = Boolean(autoRevealState?.isActive);

  const chunks = useMemo(
    () => splitAyahByWaqf(ayah.textUthmani),
    [ayah.textUthmani],
  );
  const hasMoreChunks = visibleChunkCount < chunks.length;
  const baseEaseFactor = reviewState?.easeFactor ?? 2.5;
  const baseInterval = reviewState?.interval ?? 0;
  const baseRepetitions = reviewState?.repetitions ?? 0;

  useEffect(() => {
    setRevealed(false);
    setVisibleChunkCount(1);
    setActiveRating(null);
    setAutoplayBlocked(false);
  }, [ayah.surahNumber, ayah.ayahNumber]);

  useEffect(() => {
    if (!isAutoRevealActive) {
      return;
    }

    setRevealed(true);
    setVisibleChunkCount(chunks.length);
  }, [chunks.length, isAutoRevealActive]);

  useEffect(() => {
    if (!isAutoRevealActive || !ayah.audioUrl || !audioRef.current) {
      return;
    }

    setAutoplayBlocked(false);
    void audioRef.current.play().catch(() => {
      setAutoplayBlocked(true);
    });
  }, [ayah.audioUrl, autoRevealState?.sessionId, isAutoRevealActive]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const previewCopy = useMemo(
    () =>
      locale === "id"
        ? {
            next: "Berikutnya",
            tomorrow: "besok",
            inDays: (days: number) => `${days} hari lagi`,
          }
        : {
            next: "Next",
            tomorrow: "tomorrow",
            inDays: (days: number) => `in ${days} days`,
          },
    [locale],
  );

  const ratingPreviews = useMemo(() => {
    return ratingButtons.map((button) => {
      const result = calculateSM2(
        button.value,
        baseEaseFactor,
        baseInterval,
        baseRepetitions,
      );

      const nextReviewText =
        result.interval <= 1
          ? previewCopy.tomorrow
          : previewCopy.inDays(result.interval);

      return {
        ...button,
        nextReviewText,
      };
    });
  }, [baseEaseFactor, baseInterval, baseRepetitions, previewCopy]);

  const handleRevealToggle = () => {
    if (isAutoRevealActive) {
      return;
    }

    setRevealed((current) => {
      const next = !current;

      if (next) {
        setVisibleChunkCount(1);
      }

      return next;
    });
  };

  const cardFeedbackClass =
    activeRating === 1
      ? "motion-safe:animate-rating-card-again"
      : activeRating === 2
        ? "motion-safe:animate-rating-card-hard"
        : activeRating === 3
          ? "motion-safe:animate-rating-card-good"
          : activeRating === 4
            ? "motion-safe:animate-rating-card-easy"
            : "";

  const handleRateClick = (rating: SM2Rating) => {
    if (isSubmitting || isAutoRevealActive) {
      return;
    }

    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    setActiveRating(rating);
    feedbackTimerRef.current = window.setTimeout(() => {
      setActiveRating(null);
      feedbackTimerRef.current = null;
    }, 560);

    onRate(rating);
  };

  return (
    <article
      className={`w-full max-w-3xl rounded-[28px] border border-emerald-900/15 bg-[#FDFCF0]/90 p-6 shadow-[0_20px_60px_-32px_rgba(6,78,59,0.45)] backdrop-blur-sm transition-shadow dark:border-emerald-200/15 dark:bg-emerald-950/65 ${cardFeedbackClass}`}
    >
      <header className="mb-5 text-center">
        <p className="text-sm font-medium tracking-wide text-emerald-900/80 dark:text-emerald-200/80">
          {t("quran.surah", locale)} {ayah.surahNumber} ·{" "}
          <span className="font-semibold text-emerald-950 dark:text-emerald-50">
            {surahName}
          </span>
          {" · "}
          {t("quran.ayah", locale)} {ayah.ayahNumber}
        </p>
      </header>

      <div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <div className="rounded-full border border-emerald-900/10 bg-emerald-900/5 px-3 py-1 text-xs font-medium text-emerald-900/75 dark:border-emerald-200/10 dark:bg-emerald-100/5 dark:text-emerald-100/75">
            {t("quran.rateWithoutReveal", locale)}
          </div>
          {relearningState ? (
            <div className="rounded-full border border-amber-600/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
              {t("page.relearningBadge", locale)} ·{" "}
              {t("page.relearningAttempt", locale)} {relearningState.attempt} ·{" "}
              {relearningState.queuePosition}/{relearningState.queueSize}
            </div>
          ) : null}
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRevealToggle}
            disabled={isAutoRevealActive}
            className="rounded-xl border border-emerald-900/15 bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-[#FDFCF0] transition-colors hover:bg-emerald-800 dark:border-emerald-100/10"
          >
            {revealed ? t("quran.hideHint", locale) : t("quran.reveal", locale)}
          </button>
        </div>
      </div>

      {relearningState ? (
        <p className="mb-5 text-center text-xs font-medium text-amber-800 dark:text-amber-100">
          {t("page.relearningPriority", locale)}
        </p>
      ) : null}

      {revealed ? (
        <>
          <section
            className="mb-6 rounded-2xl border border-emerald-900/8 bg-emerald-950/5 p-5 dark:border-emerald-100/10 dark:bg-emerald-100/5"
            dir="rtl"
            lang="ar"
          >
            <p
              className="text-right text-3xl leading-[2.4] text-emerald-950 dark:text-emerald-50"
              style={{ fontFamily: '"Amiri", "Scheherazade New", serif' }}
            >
              {chunks.slice(0, visibleChunkCount).join(" ")}
            </p>
          </section>

          {ayah.audioUrl ? (
            <div className="mb-6">
              <audio
                ref={audioRef}
                className="w-full"
                controls
                preload="none"
                src={ayah.audioUrl}
              >
                {t("quran.audioNotSupported", locale)}
              </audio>

              {isAutoRevealActive ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-900/15 bg-emerald-900/5 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100">
                  <p>
                    {t("quran.autoAdvanceCountdown", locale)}:{" "}
                    {autoRevealState?.remainingSeconds}s
                  </p>
                  {onForceSkipAutoReveal ? (
                    <button
                      type="button"
                      onClick={onForceSkipAutoReveal}
                      className="rounded-lg bg-emerald-900 px-2.5 py-1.5 font-semibold text-[#FDFCF0] transition-colors hover:bg-emerald-800"
                    >
                      {t("quran.forceSkipReveal", locale)}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {autoplayBlocked ? (
                <p className="mt-2 text-xs text-emerald-900/75 dark:text-emerald-100/75">
                  {t("quran.autoplayBlockedFallback", locale)}
                </p>
              ) : null}
            </div>
          ) : null}

          {chunks.length > 1 && hasMoreChunks ? (
            <div className="mb-6 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setVisibleChunkCount((count: number) =>
                    Math.min(count + 1, chunks.length),
                  )
                }
                className="rounded-xl border border-emerald-900/30 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
              >
                {t("quran.revealNextPhrase", locale)} ({visibleChunkCount}/
                {chunks.length})
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <section className="mb-6 rounded-2xl border border-dashed border-emerald-900/15 bg-emerald-900/5 p-6 text-center dark:border-emerald-100/10 dark:bg-emerald-100/5">
          <p className="text-sm text-emerald-900/70 dark:text-emerald-200/75">
            • • • • •
          </p>
        </section>
      )}

      <footer className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ratingPreviews.map((button) => (
          <div
            key={button.value}
            className="rounded-2xl border border-emerald-900/10 bg-emerald-900/5 p-2 dark:border-emerald-100/10 dark:bg-emerald-100/5"
          >
            <button
              type="button"
              disabled={isSubmitting || isAutoRevealActive}
              onClick={() => handleRateClick(button.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 motion-reduce:transition-none ${button.classes} ${
                activeRating === button.value
                  ? "motion-safe:animate-rating-press ring-2 ring-white/50 ring-offset-2 ring-offset-transparent"
                  : ""
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {t(button.labelKey, locale)}
            </button>
            <p className="mt-2 px-1 text-[11px] leading-4 text-emerald-900/80 dark:text-emerald-100/80">
              <span className="font-semibold">{previewCopy.next}:</span>{" "}
              {button.nextReviewText}
            </p>
          </div>
        ))}
      </footer>
    </article>
  );
}
