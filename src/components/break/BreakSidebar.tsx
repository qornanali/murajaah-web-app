import { t, type AppLocale } from "@/lib/i18n";

interface BreakSidebarProps {
  locale: AppLocale;
  onTakeBreak: () => void;
  onResume: () => void;
  isOnBreak: boolean;
}

export default function BreakSidebar({
  locale,
  onTakeBreak,
  onResume,
  isOnBreak,
}: BreakSidebarProps) {
  if (isOnBreak) {
    return (
      <div className="rounded-[28px] border border-emerald-900/15 bg-white/70 p-5 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
        <div className="text-center">
          <p className="text-2xl mb-3">🌿</p>
          <p className="font-semibold text-lg">
            {t("page.breakTitle", locale)}
          </p>
          <p className="mt-3 text-emerald-900/80 dark:text-emerald-100/80">
            {t("page.breakMessage", locale)}
          </p>
          <p className="mt-2 text-xs text-emerald-900/60 dark:text-emerald-200/60">
            {t("page.breakSuggestion", locale)}
          </p>
          <button
            type="button"
            onClick={onResume}
            className="mt-4 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            {t("page.resumePractice", locale)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-emerald-900/15 bg-white/70 p-4 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
      <button
        type="button"
        onClick={onTakeBreak}
        className="w-full rounded-lg bg-emerald-900/10 px-3 py-2.5 font-medium text-emerald-900 transition-colors hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
      >
        {t("page.takeBreak", locale)}
      </button>
    </div>
  );
}
