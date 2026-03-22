"use client";

import { RotateCcw, ChevronRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { getSurahName } from "@/lib/quranMeta";
import { useLocaleStore } from "@/store/localeStore";
import type { SurahMastery } from "@/store/reviewStore";

interface SurahCompletionCardProps {
  mastery: SurahMastery;
  onRest: () => void;
  onNextSurah: () => void;
}

export function SurahCompletionCard({
  mastery,
  onRest,
  onNextSurah,
}: SurahCompletionCardProps) {
  const locale = useLocaleStore((state) => state.locale);
  const surahName = getSurahName(mastery.surahNumber);
  const recallAccuracy = Math.round(
    (mastery.masteredCount / mastery.totalAyahs) * 100,
  );

  return (
    <div className="flex flex-col items-center justify-center space-y-6 rounded-[32px] border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-8 text-center shadow-lg dark:border-emerald-400 dark:from-emerald-900/20 dark:to-emerald-900/10">
      <div className="space-y-3">
        <div className="text-5xl">✨</div>
        <h2 className="text-3xl font-bold text-emerald-950 dark:text-emerald-100">
          {t("page.surahCompletionTitle", locale)}
        </h2>
        <p className="text-xl font-semibold text-emerald-900 dark:text-emerald-200">
          Surah {surahName}
        </p>
      </div>

      <div className="w-full space-y-4 rounded-2xl bg-white/60 p-6 dark:bg-emerald-950/40">
        <div className="space-y-2">
          <p className="text-sm font-medium text-emerald-900/70 dark:text-emerald-200/70">
            {t("page.completionStats", locale)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-100/50 p-3 dark:bg-emerald-900/30">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {mastery.totalAyahs}
              </div>
              <div className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                {t("page.totalAyahs", locale)}
              </div>
            </div>
            <div className="rounded-lg bg-emerald-100/50 p-3 dark:bg-emerald-900/30">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {recallAccuracy}%
              </div>
              <div className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                {t("page.recallAccuracy", locale)}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-200/50 pt-3 dark:border-emerald-700/50">
          <p className="text-xs text-emerald-900/60 dark:text-emerald-200/60">
            {t("page.nextReviewSuggestion", locale)}{" "}
            <span className="font-semibold">30+</span> {t("page.days", locale)}
          </p>
        </div>
      </div>

      <p className="text-sm text-emerald-900/70 dark:text-emerald-200/75">
        {t("page.completionMessage", locale)}
      </p>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRest}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-900/20 px-4 py-3 font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/30 dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
        >
          <RotateCcw size={18} />
          {t("page.takeSuggestedBreak", locale)}
        </button>
        <button
          type="button"
          onClick={onNextSurah}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {t("page.nextSurah", locale)}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
