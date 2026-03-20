"use client";

import { t } from "@/lib/i18n";
import { type AppLocale } from "@/lib/i18n";

interface OnboardingModalProps {
  isOpen: boolean;
  locale: AppLocale;
  onClose: () => void;
}

export default function OnboardingModal({
  isOpen,
  locale,
  onClose,
}: OnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/50 p-3 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("page.methodology", locale)}
        className="w-full max-w-md rounded-[24px] border border-emerald-900/15 bg-white p-6 text-emerald-950 shadow-[0_24px_80px_-40px_rgba(6,78,59,0.65)] dark:border-emerald-100/15 dark:bg-emerald-950 dark:text-emerald-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {t("page.methodology", locale)}
            </h2>
            <div className="mt-4 space-y-3 text-sm text-emerald-900/80 dark:text-emerald-200/80">
              <p>{t("page.methodologyStep1", locale)}</p>
              <p>{t("page.methodologyStep2", locale)}</p>
              <p>{t("page.methodologyStep3", locale)}</p>
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-900/10 bg-emerald-900/5 p-4 text-sm text-emerald-900/80 dark:border-emerald-100/10 dark:bg-emerald-100/5 dark:text-emerald-100/80">
              <p>{t("page.ankiInspired", locale)}</p>
              <a
                href="https://apps.ankiweb.net/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
              >
                {t("page.ankiLink", locale)}
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-full border border-emerald-900/15 bg-emerald-900/5 px-4 py-2 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
          >
            {t("page.closeModal", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
