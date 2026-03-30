import AyahCard, { type AyahCardData } from "@/components/quran/AyahCard";
import { SurahCompletionCard } from "@/components/surah/SurahCompletionCard";
import BreakCard from "@/components/break/BreakCard";
import { t } from "@/lib/i18n";
import { getSurahName } from "@/lib/quranMeta";
import type { SM2Rating } from "@/lib/srs";
import type { AppLocale } from "@/lib/i18n";
import type { SurahMastery } from "@/store/reviewStore";
import type { MemorizationPackage } from "@/lib/packages/types";

interface PracticeSectionProps {
  locale: AppLocale;
  ayah: AyahCardData | null;
  ayahLoading: boolean;
  ayahError: string | null;
  selectedPackageId: string | null;
  packages: MemorizationPackage[];
  selectedSurahNumber: number;
  hasCompletedSurah: boolean;
  completedSurahNumber: number | null;
  shouldShowBreak: boolean;
  sessionNewAyahsCleared: number;
  isSaving: boolean;
  postRatingReveal: {
    remainingSeconds: number;
    totalSeconds: number;
    sessionId: number;
  } | null;
  activeRelearnItem: {
    attempts: number;
  } | null;
  activeRelearnIndex: number;
  sessionRelearnQueueLength: number;
  latestProgress: {
    easeFactor: number;
    interval: number;
    repetitions: number;
  } | null;
  surahMasteryData: Record<string, Record<number, SurahMastery>>;
  newVerseKeysToday: Set<string>;
  onRate: (rating: SM2Rating) => Promise<void>;
  onForceSkipPostRatingReveal: () => void;
  onSurahCompletionRest: () => void;
  onSurahCompletionNext: () => Promise<void>;
  onResumeFromBreak: () => void;
  onOpenSourceSheet: () => void;
  onOpenMethodologyModal: () => void;
  onRetryLoadAyah: () => void;
}

export function PracticeSection({
  locale,
  ayah,
  ayahLoading,
  ayahError,
  selectedPackageId,
  packages,
  selectedSurahNumber,
  hasCompletedSurah,
  completedSurahNumber,
  shouldShowBreak,
  sessionNewAyahsCleared,
  isSaving,
  postRatingReveal,
  activeRelearnItem,
  activeRelearnIndex,
  sessionRelearnQueueLength,
  latestProgress,
  surahMasteryData,
  newVerseKeysToday,
  onRate,
  onForceSkipPostRatingReveal,
  onSurahCompletionRest,
  onSurahCompletionNext,
  onResumeFromBreak,
  onOpenSourceSheet,
  onOpenMethodologyModal,
  onRetryLoadAyah,
}: PracticeSectionProps) {
  return (
    <section className="rounded-[32px] border border-emerald-900/15 bg-white/55 p-4 shadow-[0_24px_70px_-42px_rgba(6,78,59,0.42)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/50 md:p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
            {t("page.practiceSectionTitle", locale)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[28px] border border-emerald-900/15 bg-white/70 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
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
              onClick={onOpenSourceSheet}
              className="rounded-full border border-emerald-900/15 bg-emerald-900/5 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
            >
              {t("page.chooseSource", locale)}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenMethodologyModal}
          className="group flex items-center gap-2 rounded-full border-0 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:from-emerald-700 hover:to-emerald-600 dark:from-emerald-500 dark:to-emerald-400 dark:hover:from-emerald-600 dark:hover:to-emerald-500"
        >
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:scale-110"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t("page.learnAboutMethodology", locale)}
        </button>

        {ayahLoading ? (
          <div className="rounded-[28px] border border-emerald-900/15 bg-white/70 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            {t("page.loadingAyah", locale)}
          </div>
        ) : null}
        {ayahError ? (
          <div className="rounded-[28px] border border-rose-700/30 bg-rose-50 p-4 text-sm text-rose-900 shadow-[0_20px_60px_-36px_rgba(190,24,93,0.35)] dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
            {ayahError}
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetryLoadAyah}
                className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-800"
              >
                {t("common.retry", locale)}
              </button>
            </div>
          </div>
        ) : null}
        {hasCompletedSurah && completedSurahNumber && selectedPackageId ? (
          <SurahCompletionCard
            mastery={surahMasteryData[selectedPackageId][completedSurahNumber]}
            onRest={onSurahCompletionRest}
            onNextSurah={onSurahCompletionNext}
          />
        ) : shouldShowBreak ? (
          <BreakCard
            locale={locale}
            clearCount={sessionNewAyahsCleared}
            onResume={onResumeFromBreak}
          />
        ) : ayah ? (
          <AyahCard
            ayah={ayah}
            isSubmitting={isSaving || Boolean(postRatingReveal)}
            onRate={onRate}
            autoRevealState={
              postRatingReveal
                ? {
                    isActive: true,
                    remainingSeconds: postRatingReveal.remainingSeconds,
                    totalSeconds: postRatingReveal.totalSeconds,
                    sessionId: postRatingReveal.sessionId,
                  }
                : null
            }
            onForceSkipAutoReveal={onForceSkipPostRatingReveal}
            relearningState={
              activeRelearnItem
                ? {
                    attempt: activeRelearnItem.attempts,
                    queuePosition: activeRelearnIndex + 1,
                    queueSize: sessionRelearnQueueLength,
                  }
                : null
            }
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
      </div>
    </section>
  );
}
