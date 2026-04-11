"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { t } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import { useThemeStore } from "@/store/themeStore";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((state) => state.locale);
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const [isRedirecting, setIsRedirecting] = useState(false);

  const allowAuthScreen = searchParams.get("auth") === "1";
  const oauthStatus = searchParams.get("qf_link");

  useEffect(() => {
    initializeLocale();
  }, [initializeLocale]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    if (!allowAuthScreen) {
      router.replace("/");
    }
  }, [allowAuthScreen, router]);

  if (!allowAuthScreen) {
    return null;
  }

  const handleOAuthStart = () => {
    setIsRedirecting(true);
    window.location.href = "/api/user/oauth/start";
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[28px] border border-emerald-900/15 bg-[#FDFCF0]/90 p-8 shadow-[0_20px_60px_-32px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/65">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-3">
            <Image
              src="/icon.svg"
              alt="Murajaah"
              width={44}
              height={44}
              priority
              className="h-11 w-11 rounded-xl"
            />
            <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-100">
              Murajaah
            </h1>
          </div>
          <p className="mt-1 text-sm text-emerald-900/70 dark:text-emerald-200/80">
            {t("auth.quranAuthDescription", locale)}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
              {t("common.language", locale)}:
            </span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                locale === "en"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("id")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                locale === "id"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              ID
            </button>
            <span className="ml-2 text-xs text-emerald-900/70 dark:text-emerald-200/80">
              {t("common.theme", locale)}:
            </span>
            <button
              type="button"
              onClick={() => setTheme("light")}
              aria-label={t("common.light", locale)}
              title={t("common.light", locale)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                theme === "light"
                  ? "border-emerald-900 bg-emerald-900 text-white dark:border-emerald-100"
                  : "border-emerald-900/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m4.93 19.07 1.41-1.41" />
                <path d="m17.66 6.34 1.41-1.41" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-label={t("common.dark", locale)}
              title={t("common.dark", locale)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                theme === "dark"
                  ? "border-emerald-900 bg-emerald-900 text-white dark:border-emerald-100"
                  : "border-emerald-900/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            </button>
          </div>
        </div>

        {oauthStatus === "linked" ? (
          <div className="mb-4 rounded-lg border border-emerald-700/30 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-300/25 dark:bg-emerald-950/40 dark:text-emerald-100">
            {t("auth.oauthLinked", locale)}
          </div>
        ) : null}

        {oauthStatus === "error" ? (
          <div className="mb-4 rounded-lg border border-rose-700/30 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
            {t("auth.oauthError", locale)}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleOAuthStart}
          disabled={isRedirecting}
          className="w-full rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRedirecting
            ? t("auth.pleaseWait", locale)
            : t("auth.signInWithQuran", locale)}
        </button>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              router.push("/");
            }}
            className="w-full rounded-lg border border-emerald-900/25 bg-emerald-900/5 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-200/25 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
          >
            {t("auth.continueAsGuest", locale)}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
