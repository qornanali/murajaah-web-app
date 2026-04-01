"use client";

import { useRouter } from "next/navigation";
import { BookOpenCheck, Loader2 } from "lucide-react";

import { t } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n";

interface DueReviewCardProps {
  locale: AppLocale;
  dueCount: number;
  isLoading: boolean;
}

export function DueReviewCard({ locale, dueCount, isLoading }: DueReviewCardProps) {
  const router = useRouter();

  const handleStart = () => {
    router.push("/practice/all/all");
  };

  return (
    <section className="rounded-[32px] border border-emerald-900/15 bg-white/55 shadow-[0_24px_70px_-42px_rgba(6,78,59,0.42)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/50">
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 px-6 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700 dark:text-emerald-300" />
          <p className="text-sm text-emerald-900/60 dark:text-emerald-100/60">
            {t("practice.dueCard.loading", locale)}
          </p>
        </div>
      ) : dueCount === 0 ? (
        <AllCaughtUpState locale={locale} />
      ) : (
        <DueState locale={locale} dueCount={dueCount} onStart={handleStart} />
      )}
    </section>
  );
}

function DueState({
  locale,
  dueCount,
  onStart,
}: {
  locale: AppLocale;
  dueCount: number;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-emerald-900/70 dark:text-emerald-100/70">
            {t("practice.dueCard.title", locale)}
          </p>
          <p className="text-[11px] text-emerald-900/50 dark:text-emerald-100/50">
            {t("practice.dueCard.subtitle", locale)}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-900/10 dark:bg-emerald-100/10">
          <BookOpenCheck className="h-5 w-5 text-emerald-900 dark:text-emerald-100" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-5xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50">
            {dueCount}
          </span>
          <span className="ml-2 text-base font-medium text-emerald-900/60 dark:text-emerald-100/60">
            {dueCount === 1
              ? t("page.ayahDueSingular", locale)
              : t("page.ayahDuePlural", locale)}
          </span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="rounded-2xl bg-emerald-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(6,78,59,0.6)] transition-all duration-200 hover:bg-emerald-800 active:scale-95 dark:bg-emerald-200 dark:text-emerald-950 dark:shadow-[0_8px_24px_-8px_rgba(167,243,208,0.3)] dark:hover:bg-emerald-100"
        >
          {t("practice.dueCard.cta", locale)}
        </button>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-emerald-900/10 dark:bg-emerald-100/10">
        <div
          className="h-full rounded-full bg-emerald-700 transition-[width] duration-700 ease-out dark:bg-emerald-400"
          style={{ width: `${Math.min(100, (dueCount / Math.max(dueCount, 20)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function AllCaughtUpState({ locale }: { locale: AppLocale }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
        <BookOpenCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
      </div>
      <p className="text-base font-semibold text-emerald-950 dark:text-emerald-50">
        {t("practice.dueCard.allCaughtUp", locale)}
      </p>
      <p className="text-sm text-emerald-900/60 dark:text-emerald-100/60">
        {t("practice.dueCard.allCaughtUpSubtitle", locale)}
      </p>
    </div>
  );
}
