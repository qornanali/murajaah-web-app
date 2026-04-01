"use client";

import { useEffect } from "react";
import { t, type AppLocale } from "@/lib/i18n";

interface MethodologyModalProps {
  isOpen: boolean;
  locale: AppLocale;
  onClose: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _stepIcons = [
  {
    path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    label: "Recall",
  },
  {
    path: "M7 12a1 1 0 110-2 1 1 0 010 2zM13 12a1 1 0 110-2 1 1 0 010 2zM19 12a1 1 0 110-2 1 1 0 010 2z",
    label: "Rate",
  },
  {
    path: "M13 10V3L4 14h7v7l9-11h-7z",
    label: "Review",
  },
];

export default function MethodologyModal({
  isOpen,
  locale,
  onClose,
}: MethodologyModalProps) {
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

  const steps = [
    t("page.methodologyStep1", locale),
    t("page.methodologyStep2", locale),
    t("page.methodologyStep3", locale),
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
      role="presentation"
    >
      <div 
        className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 shadow-2xl dark:border-emerald-700/40 dark:from-emerald-950 dark:via-emerald-900/40 dark:to-emerald-950/60 sm:rounded-3xl lg:max-w-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-emerald-200/40 bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-3 dark:border-emerald-700/40 dark:from-emerald-950/80 dark:to-emerald-900/40 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-emerald-950 dark:text-emerald-50 sm:text-xl">
                {t("page.methodology", locale)}
              </h2>
              <p className="mt-0.5 text-xs text-emerald-700/70 dark:text-emerald-300/60">
                Master Quran memorization through spaced repetition
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-full p-2 text-emerald-900/60 transition-all hover:bg-emerald-900/10 hover:text-emerald-900 dark:text-emerald-200/60 dark:hover:bg-emerald-100/10 dark:hover:text-emerald-200"
              aria-label={t("page.closeModal", locale)}
            >
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-3 px-5 py-3 sm:px-6 sm:py-3 lg:space-y-4">
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-emerald-200/40 bg-white/80 p-3 transition-all duration-300 hover:border-emerald-300/60 hover:shadow-lg dark:border-emerald-700/40 dark:bg-emerald-800/20 dark:hover:border-emerald-600/60 dark:hover:shadow-xl sm:p-4"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-emerald-400/5" />

                <div className="relative">
                  <div className="mb-0 flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white dark:bg-emerald-600">
                      {index + 1}
                    </span>
                    <p className="text-xs leading-relaxed text-emerald-950/80 dark:text-emerald-100/80 sm:text-sm">
                      {step}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-3 overflow-hidden rounded-xl border border-emerald-300/30 bg-gradient-to-br from-emerald-100/30 via-emerald-50/30 to-transparent p-3 dark:border-emerald-600/30 dark:from-emerald-900/40 dark:via-emerald-800/20 dark:to-transparent sm:p-4">
            <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-br from-emerald-200/20 to-transparent blur-3xl dark:from-emerald-600/10" />

            <div className="relative">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-1 w-5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-300" />
                <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
                  Inspired by Anki
                </p>
              </div>

              <p className="mb-2 text-xs leading-relaxed text-emerald-950/75 dark:text-emerald-100/75 sm:text-sm">
                {t("page.ankiInspired", locale)}
              </p>
              <a
                href="https://apps.ankiweb.net/"
                target="_blank"
                rel="noreferrer"
                className="group/link inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-800 hover:shadow-lg dark:bg-emerald-600 dark:hover:bg-emerald-700 sm:px-3 sm:py-1.5"
              >
                {t("page.ankiLink", locale)}
                <svg
                  className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:shadow-lg dark:from-emerald-600 dark:to-emerald-500 dark:hover:shadow-lg sm:py-2 sm:text-sm"
          >
            {t("page.closeModal", locale)}
          </button>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
