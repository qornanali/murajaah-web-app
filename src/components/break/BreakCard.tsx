import { t, type AppLocale } from "@/lib/i18n";

interface BreakCardProps {
  locale: AppLocale;
  onResume: () => void;
  clearCount: number;
}

export default function BreakCard({
  locale,
  onResume,
  clearCount,
}: BreakCardProps) {
  return (
    <div className="rounded-[28px] border border-emerald-900/15 bg-white/70 p-8 text-center text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
      <p className="text-5xl mb-4">🌿</p>
      <p className="font-semibold text-2xl mb-3">
        {t("page.breakTitle", locale)}
      </p>
      <p className="mt-4 text-emerald-900/80 dark:text-emerald-100/80 mb-2">
        {t("page.breakMessage", locale)}
      </p>
      <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70 mb-4">
        {t("page.breakSuggestion", locale)}
      </p>
      <p className="text-sm font-medium text-emerald-900/60 dark:text-emerald-200/60 mb-6">
        {clearCount} ayahs cleared this session
      </p>
      <button
        type="button"
        onClick={onResume}
        className="rounded-lg bg-emerald-900 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-800"
      >
        {t("page.resumePractice", locale)}
      </button>
    </div>
  );
}
