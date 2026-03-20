"use client";

import { t } from "@/lib/i18n";
import { type AppLocale } from "@/lib/i18n";

interface MethodologySectionProps {
  locale: AppLocale;
}

export default function MethodologySection({
  locale,
}: MethodologySectionProps) {
  return (
    <section className="rounded-[28px] border border-emerald-900/15 bg-white/65 p-5 text-sm text-emerald-950 shadow-[0_20px_60px_-36px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/60 dark:text-emerald-100">
      <div>
        <p className="font-semibold">{t("page.methodology", locale)}</p>
        <div className="mt-3 space-y-2 text-emerald-900/80 dark:text-emerald-200/80">
          <p>{t("page.methodologyStep1", locale)}</p>
          <p>{t("page.methodologyStep2", locale)}</p>
          <p>{t("page.methodologyStep3", locale)}</p>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-900/10 bg-emerald-900/5 p-4 text-emerald-900/80 dark:border-emerald-100/10 dark:bg-emerald-100/5 dark:text-emerald-100/80">
          <p>{t("page.ankiInspired", locale)}</p>
          <a
            href="https://apps.ankiweb.net/"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
          >
            {t("page.ankiLink", locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
