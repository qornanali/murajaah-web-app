"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { useThemeStore } from "@/store/themeStore";

export default function LoginPage() {
  const locale = useLocaleStore((state) => state.locale);
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  useEffect(() => {
    initializeLocale();
  }, [initializeLocale]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    if (isSignUp) {
      const success = await signUp(email, password);
      if (success) {
        setEmail("");
        setPassword("");
      }
    } else {
      const success = await signIn(email, password);
      if (success) {
        setEmail("");
        setPassword("");
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[28px] border border-emerald-900/15 bg-[#FDFCF0]/90 p-8 shadow-[0_20px_60px_-32px_rgba(6,78,59,0.45)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/65">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Image
              src="/logo.svg"
              alt="Murajaah"
              width={240}
              height={68}
              priority
              className="h-auto w-[220px] sm:w-[240px]"
            />
          </div>
          <p className="mt-1 text-sm text-emerald-900/70 dark:text-emerald-200/80">
            {isSignUp
              ? t("auth.createYourAccount", locale)
              : t("auth.signInToContinue", locale)}
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
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                theme === "light"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              {t("common.light", locale)}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                theme === "dark"
                  ? "bg-emerald-900 text-white"
                  : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/20 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/20"
              }`}
            >
              {t("common.dark", locale)}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-emerald-950 dark:text-emerald-100"
            >
              {t("auth.email", locale)}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder", locale)}
              className="mt-1 w-full rounded-lg border border-emerald-900/20 bg-white px-4 py-2 text-sm text-emerald-950 placeholder-emerald-900/50 focus:border-emerald-700 focus:outline-none dark:border-emerald-200/20 dark:bg-emerald-950/60 dark:text-emerald-100 dark:placeholder-emerald-200/60"
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-emerald-950 dark:text-emerald-100"
            >
              {t("auth.password", locale)}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder", locale)}
              className="mt-1 w-full rounded-lg border border-emerald-900/20 bg-white px-4 py-2 text-sm text-emerald-950 placeholder-emerald-900/50 focus:border-emerald-700 focus:outline-none dark:border-emerald-200/20 dark:bg-emerald-950/60 dark:text-emerald-100 dark:placeholder-emerald-200/60"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-700/30 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? t("auth.pleaseWait", locale)
              : isSignUp
                ? t("auth.createAccount", locale)
                : t("auth.signIn", locale)}
          </button>
        </form>

        <div className="mt-6 border-t border-emerald-900/10 pt-6 text-center dark:border-emerald-200/10">
          <p className="text-sm text-emerald-900/70 dark:text-emerald-200/80">
            {isSignUp
              ? `${t("auth.alreadyHaveAccount", locale)} `
              : `${t("auth.dontHaveAccount", locale)} `}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
              }}
              className="font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
            >
              {isSignUp
                ? t("auth.signIn", locale)
                : t("auth.createOne", locale)}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
