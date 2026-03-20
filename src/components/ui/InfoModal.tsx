"use client";

import { useEffect } from "react";

import { t, type AppLocale } from "@/lib/i18n";

export type InfoTab = "source" | "credit" | "legal" | "feedback";

type InfoModalProps = {
  activeTab: InfoTab;
  isOpen: boolean;
  locale: AppLocale;
  onClose: () => void;
  onSelectTab: (tab: InfoTab) => void;
};

const tabs: Array<{ key: InfoTab; labelKey: string }> = [
  { key: "source", labelKey: "page.sourceTab" },
  { key: "credit", labelKey: "page.creditTab" },
  { key: "legal", labelKey: "page.legalTab" },
  { key: "feedback", labelKey: "page.feedbackTab" },
];

export default function InfoModal({
  activeTab,
  isOpen,
  locale,
  onClose,
  onSelectTab,
}: InfoModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/55 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("page.infoCenter", locale)}
        className="w-full max-w-2xl rounded-[28px] border border-emerald-900/15 bg-white/95 p-5 text-emerald-950 shadow-[0_24px_80px_-40px_rgba(6,78,59,0.65)] dark:border-emerald-100/15 dark:bg-emerald-950/95 dark:text-emerald-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">
              {t("page.infoCenter", locale)}
            </p>
            <p className="mt-1 text-sm text-emerald-900/70 dark:text-emerald-200/75">
              {t("page.infoCenterDescription", locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-emerald-900/15 bg-emerald-900/5 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
          >
            {t("page.closeModal", locale)}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-emerald-900 text-white"
                    : "border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
                }`}
              >
                {t(tab.labelKey, locale)}
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-3xl border border-emerald-900/10 bg-emerald-900/5 p-5 text-sm dark:border-emerald-100/10 dark:bg-emerald-100/5">
          {activeTab === "source" ? (
            <div className="space-y-3">
              <p className="font-semibold">{t("page.dataSource", locale)}</p>
              <p className="text-emerald-900/80 dark:text-emerald-200/80">
                {t("page.sourceDescription", locale)}
              </p>
              <p className="text-emerald-900/80 dark:text-emerald-200/80">
                <a
                  href="https://quran.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  Quran.com
                </a>{" "}
                · {t("page.quranTextSource", locale)}
              </p>
            </div>
          ) : null}

          {activeTab === "credit" ? (
            <div className="space-y-3">
              <p className="font-semibold">{t("page.credit", locale)}</p>
              <p className="text-emerald-900/80 dark:text-emerald-200/80">
                {t("page.creditDescription", locale)}
              </p>
              <p className="text-emerald-900/80 dark:text-emerald-200/80">
                Ali Qornan ·{" "}
                <a
                  href="https://github.com/qornanali"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  GitHub
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.linkedin.com/in/aliqornan/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  LinkedIn
                </a>
                <br />
                Muhammad Jafar ·{" "}
                <a
                  href="https://github.com/mhmmdjafarg"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  GitHub
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.linkedin.com/in/mhmmdjafarg/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  LinkedIn
                </a>
              </p>
            </div>
          ) : null}

          {activeTab === "legal" ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">
                  {t("page.privacyTitle", locale)}
                </p>
                <p className="mt-2 text-emerald-900/80 dark:text-emerald-200/80">
                  {t("page.privacyBody", locale)}
                </p>
              </div>
              <div>
                <p className="font-semibold">{t("page.termsTitle", locale)}</p>
                <p className="mt-2 text-emerald-900/80 dark:text-emerald-200/80">
                  {t("page.termsBody", locale)}
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "feedback" ? (
            <div className="space-y-3">
              <p className="font-semibold">{t("page.feedback", locale)}</p>
              <p className="text-emerald-900/80 dark:text-emerald-200/80">
                {t("page.feedbackDescription", locale)}
              </p>
              <a
                href="https://forms.gle/zwdDtmFTQs2pARxK8"
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                {t("page.feedbackCta", locale)}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
