import { SurahMasteryCard } from "@/components/surah/SurahMasteryCard";
import { t } from "@/lib/i18n";
import { toVerseKey } from "@/lib/quranApi";
import type { AppLocale } from "@/lib/i18n";
import type { SurahMastery } from "@/store/reviewStore";
import type { AyahProgressRow } from "@/lib/offline/db";

interface StatsSectionProps {
  locale: AppLocale;
  reviewedVerseKeys: Set<string>;
  newVerseKeysToday: Set<string>;
  isUserApiConnected: boolean | null;
  currentStreak: number;
  longestStreak: number;
  visibleDueQueue: AyahProgressRow[];
  activePackagesCount: number;
  averageEaseFactor: number | null;
  isQueueLoading: boolean;
  selectedVerseKey: string;
  sessionRelearnQueueLength: number;
  selectedPackageId: string | null;
  dailyTargetNotice: string | null;
  surahMasteryData: Record<string, Record<number, SurahMastery>>;
  latestProgress: {
    easeFactor: number;
    interval: number;
    repetitions: number;
  } | null;
  isSaving: boolean;
  error: string | null;
  onStartDueReview: (verseKey: string) => void;
  onLoadFallbackAyah: () => void;
}

export function StatsSection({
  locale,
  reviewedVerseKeys,
  newVerseKeysToday,
  isUserApiConnected,
  currentStreak,
  longestStreak,
  visibleDueQueue,
  activePackagesCount,
  averageEaseFactor,
  isQueueLoading,
  selectedVerseKey,
  sessionRelearnQueueLength,
  selectedPackageId,
  dailyTargetNotice,
  surahMasteryData,
  latestProgress,
  isSaving,
  error,
  onStartDueReview,
  onLoadFallbackAyah,
}: StatsSectionProps) {
  return (
    <section className="rounded-[32px] border border-emerald-900/15 bg-white/55 p-4 shadow-[0_24px_70px_-42px_rgba(6,78,59,0.42)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/50 md:p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
            {t("page.historySectionTitle", locale)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="grid grid-cols-3 gap-2 md:grid-cols-7 md:gap-3">
          <div className="rounded-[20px] border border-emerald-900/15 bg-white/65 p-3 text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm md:rounded-[24px] md:p-4 dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="text-[10px] font-medium leading-tight text-emerald-900/65 md:text-[11px] dark:text-emerald-200/65">
              {t("page.totalReviewedVerses", locale)}
            </p>
            <p className="mt-1.5 text-lg font-semibold md:mt-2 md:text-2xl">
              {reviewedVerseKeys.size}
            </p>
          </div>
          <div className="rounded-[20px] border border-emerald-900/15 bg-white/65 p-3 text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm md:rounded-[24px] md:p-4 dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="text-[10px] font-medium leading-tight text-emerald-900/65 md:text-[11px] dark:text-emerald-200/65">
              {t("page.newToday", locale)}
            </p>
            <p className="mt-1.5 text-lg font-semibold md:mt-2 md:text-2xl">
              {newVerseKeysToday.size}
            </p>
          </div>
          <div className="rounded-[20px] border border-emerald-900/15 bg-white/65 p-3 text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm md:rounded-[24px] md:p-4 dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="text-[10px] font-medium leading-tight text-emerald-900/65 md:text-[11px] dark:text-emerald-200/65">
              {t("page.dueNow", locale)}
            </p>
            <p className="mt-1.5 text-lg font-semibold md:mt-2 md:text-2xl">
              {visibleDueQueue.length}
            </p>
          </div>
          <div className="hidden rounded-[24px] border border-emerald-900/15 bg-white/65 p-4 text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm md:block dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="text-[11px] font-medium leading-tight text-emerald-900/65 dark:text-emerald-200/65">
              {t("page.activePackagesCount", locale)}
            </p>
            <p className="mt-2 text-2xl font-semibold">{activePackagesCount}</p>
          </div>
          <div className="hidden rounded-[24px] border border-emerald-900/15 bg-white/65 p-4 text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm md:block dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="text-[11px] font-medium leading-tight text-emerald-900/65 dark:text-emerald-200/65">
              {t("page.currentStreak", locale)}
            </p>
            <p className="mt-2 text-2xl font-semibold">{currentStreak}</p>
          </div>
          <div className="hidden rounded-[24px] border border-emerald-900/15 bg-white/65 p-4 text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm md:block dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="text-[11px] font-medium leading-tight text-emerald-900/65 dark:text-emerald-200/65">
              {t("page.longestStreak", locale)}
            </p>
            <p className="mt-2 text-2xl font-semibold">{longestStreak}</p>
          </div>
          <div className="hidden rounded-[24px] border border-emerald-900/15 bg-white/65 p-4 text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm md:block dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
            <p className="text-[11px] font-medium leading-tight text-emerald-900/65 dark:text-emerald-200/65">
              {t("page.averageEf", locale)}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {averageEaseFactor?.toFixed(2) ?? "-"}
            </p>
          </div>
        </section>

        {isUserApiConnected !== null ? (
          <div
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isUserApiConnected
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-100"
                : "bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-100"
            }`}
          >
            {isUserApiConnected
              ? t("page.userApiConnected", locale)
              : t("page.userApiUnavailable", locale)}
          </div>
        ) : null}

        {selectedPackageId &&
        surahMasteryData[selectedPackageId] &&
        Object.keys(surahMasteryData[selectedPackageId]).length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
              {t("page.surahMasteryTitle", locale)}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.values(surahMasteryData[selectedPackageId]).map(
                (mastery) => (
                  <SurahMasteryCard
                    key={mastery.surahNumber}
                    mastery={mastery}
                  />
                ),
              )}
            </div>
          </div>
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
              <p className="mt-1 hidden text-xs text-emerald-800/70 dark:text-emerald-200/70 sm:block">
                {t("page.newToday", locale)}: {newVerseKeysToday.size}
              </p>
              {sessionRelearnQueueLength > 0 ? (
                <>
                  <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {t("page.relearningQueue", locale)}:{" "}
                    {sessionRelearnQueueLength}{" "}
                    {sessionRelearnQueueLength === 1
                      ? t("page.relearningVerseSingular", locale)
                      : t("page.relearningVersePlural", locale)}
                  </p>
                  <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-200/80">
                    {t("page.relearningPriority", locale)}
                  </p>
                </>
              ) : null}
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
              onClick={onLoadFallbackAyah}
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
                      onStartDueReview(verseKey);
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

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <section className="rounded-[28px] border border-amber-500/20 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-[0_20px_60px_-36px_rgba(217,119,6,0.28)] dark:border-amber-300/20 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">{t("page.disclaimer", locale)}</p>
            <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
              {t("page.checkMushaf", locale)}
            </p>
          </section>

          <div className="space-y-4">
            {latestProgress ? (
              <div className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
                <p className="font-semibold">
                  {t("page.lastReviewSnapshot", locale)}
                </p>
                <p className="mt-2">
                  {t("page.ef", locale)}: {latestProgress.easeFactor} ·{" "}
                  {t("page.interval", locale)}: {latestProgress.interval}d ·{" "}
                  {t("page.reps", locale)}: {latestProgress.repetitions}
                </p>
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
        </div>
      </div>
    </section>
  );
}
