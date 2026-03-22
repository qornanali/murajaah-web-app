"use client";

import { Check, Zap } from "lucide-react";
import { t } from "@/lib/i18n";
import { getSurahName } from "@/lib/quranMeta";
import { useLocaleStore } from "@/store/localeStore";
import type { SurahMastery } from "@/store/reviewStore";

interface SurahMasteryCardProps {
  mastery: SurahMastery;
}

export function SurahMasteryCard({ mastery }: SurahMasteryCardProps) {
  const locale = useLocaleStore((state) => state.locale);
  const surahName = getSurahName(mastery.surahNumber);

  const percentComplete =
    ((mastery.masteredCount + mastery.learningCount) / mastery.totalAyahs) *
    100;

  return (
    <div className="rounded-lg border border-emerald-900/15 bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-4 dark:border-emerald-100/15 dark:from-emerald-900/10 dark:to-emerald-900/5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            Surah {surahName}
          </h3>
          <p className="text-sm text-emerald-900/60 dark:text-emerald-200/60">
            {mastery.totalAyahs} ayahs
          </p>
        </div>
        <div className="flex gap-2">
          {mastery.forwardMastery && (
            <div
              className="rounded-full bg-emerald-600 p-2 text-white"
              title={t("page.forwardMasteryLabel", locale)}
            >
              <Zap size={14} />
            </div>
          )}
          {mastery.randomMastery && (
            <div
              className="rounded-full bg-emerald-600 p-2 text-white"
              title={t("page.randomMasteryLabel", locale)}
            >
              <Check size={14} />
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-emerald-900/70 dark:text-emerald-200/70">
            {t("page.surahProgress", locale)}
          </span>
          <span className="font-semibold text-emerald-900 dark:text-emerald-100">
            {Math.round(percentComplete)}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-emerald-900/10 dark:bg-emerald-100/10">
          <div
            className="h-full transition-all bg-gradient-to-r from-emerald-500 to-emerald-600"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/40 p-2 text-center dark:bg-white/5">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {mastery.newCount}
          </div>
          <div className="text-xs text-emerald-900/70 dark:text-emerald-200/70">
            {t("page.surahNew", locale)}
          </div>
        </div>

        <div className="rounded-lg bg-white/40 p-2 text-center dark:bg-white/5">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {mastery.learningCount}
          </div>
          <div className="text-xs text-emerald-900/70 dark:text-emerald-200/70">
            {t("page.surahLearning", locale)}
          </div>
        </div>

        <div className="rounded-lg bg-white/40 p-2 text-center dark:bg-white/5">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {mastery.masteredCount}
          </div>
          <div className="text-xs text-emerald-900/70 dark:text-emerald-200/70">
            {t("page.surahMastered", locale)}
          </div>
        </div>
      </div>

      {mastery.forwardMastery && (
        <div className="mt-4 rounded-lg bg-emerald-500/10 p-2 text-center">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {t("page.forwardMasteryBadge", locale)}
          </div>
        </div>
      )}

      {mastery.randomMastery && (
        <div className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-center">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {t("page.randomMasteryBadge", locale)}
          </div>
        </div>
      )}
    </div>
  );
}
