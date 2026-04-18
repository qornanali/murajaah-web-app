import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { t } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n";

interface HeaderBarProps {
  locale: AppLocale;
  theme: "light" | "dark";
  isGuestMode: boolean;
  userEmail: string | undefined;
  dueCount?: number;
  currentStreak?: number;
  isUserApiConnected?: boolean | null;
  onSetLocale: (locale: AppLocale) => void;
  onSetTheme: (theme: "light" | "dark") => void;
  onOpenMethodologyModal: () => void;
  onSignOut: () => Promise<void>;
  isQfLinked?: boolean;
}

export function HeaderBar({
  locale,
  theme,
  isGuestMode,
  userEmail,
  dueCount,
  currentStreak,
  isUserApiConnected,
  onSetLocale,
  onSetTheme,
  onOpenMethodologyModal,
  onSignOut,
  isQfLinked,
}: HeaderBarProps) {
  const router = useRouter();

  const maskEmail = (email: string | undefined | null) => {
    if (!email) {
      return "***";
    }

    if (!email.includes("@")) {
      return email.length > 20 ? `${email.slice(0, 8)}...` : email;
    }

    const [localPart, domain] = email.split("@");
    const first = localPart.slice(0, 1);
    const last = localPart.length > 1 ? localPart.slice(-1) : "";
    const maskedMiddle = "*".repeat(
      Math.max(localPart.length - (last ? 2 : 1), 2),
    );

    return `${first}${maskedMiddle}${last}@${domain}`;
  };

  const handleSignOut = async () => {
    await onSignOut();
    router.push("/");
  };

  return (
    <div className="mb-6 w-full max-w-4xl rounded-[28px] border border-emerald-900/10 bg-white/40 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(6,78,59,0.5)] backdrop-blur-sm transition-shadow duration-300 dark:border-emerald-100/10 dark:bg-emerald-950/35">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="transition-transform duration-200 hover:scale-105">
            <Image
              src="/icon.svg"
              alt="Murajaah logo"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl"
            />
            {dueCount !== undefined && dueCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold leading-none text-white transition-all duration-300 dark:bg-emerald-400 dark:text-emerald-950">
                {dueCount > 99 ? "99+" : dueCount}
              </span>
            )}
            </div>
          </div>
          {currentStreak !== undefined && currentStreak > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 sm:hidden dark:bg-orange-900/30 dark:text-orange-300">
              🔥 {currentStreak}
            </span>
          )}
          <div className="hidden min-w-0 text-sm text-emerald-900/70 sm:block dark:text-emerald-200/80">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
                Murajaah
              </p>
              {currentStreak !== undefined && currentStreak > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  🔥 {currentStreak}
                </span>
              )}
              {isUserApiConnected === true && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300">
                  ✓ Q
                </span>
              )}
            </div>
            <p className="hidden sm:block">
              {isGuestMode ? (
                <>
                  {t("page.guestMode", locale)}{" "}
                  <span className="font-medium text-emerald-950 dark:text-emerald-100">
                    ({t("page.localOnly", locale)})
                  </span>
                </>
              ) : (
                <>
                  {t("auth.loggedInAs", locale)}:{" "}
                  <span className="font-medium text-emerald-950 dark:text-emerald-100">
                    {maskEmail(userEmail)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onSetLocale(locale === "en" ? "id" : "en")}
            aria-label={
              locale === "en" ? "Switch to Indonesian" : "Switch to English"
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-900/15 bg-emerald-900/5 px-2.5 text-xs font-semibold text-emerald-900 transition-all duration-200 hover:bg-emerald-900/10 active:scale-95 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {locale.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => onSetTheme(theme === "light" ? "dark" : "light")}
            aria-label={
              theme === "light"
                ? t("common.dark", locale)
                : t("common.light", locale)
            }
            title={
              theme === "light"
                ? t("common.dark", locale)
                : t("common.light", locale)
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 transition-all duration-200 hover:bg-emerald-900/10 active:scale-95 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
          >
            {theme === "light" ? (
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
            ) : (
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
            )}
          </button>
          {isQfLinked && (
            <button
              type="button"
              onClick={() => router.push("/bookmarks")}
              aria-label="My bookmarks"
              title="My bookmarks"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 transition-all duration-200 hover:bg-emerald-900/10 active:scale-95 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenMethodologyModal}
            aria-label={t("page.learnAboutMethodology", locale)}
            title={t("page.learnAboutMethodology", locale)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 transition-all duration-200 hover:bg-emerald-900/10 active:scale-95 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
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
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </button>
          {isGuestMode ? (
            <button
              type="button"
              onClick={() => {
                router.push("/login?auth=1");
              }}
              className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 transition-all duration-200 hover:bg-emerald-900/30 active:scale-[0.97] dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
            >
              {t("auth.signIn", locale)}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleSignOut();
                }}
                className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 transition-all duration-200 hover:bg-emerald-900/30 active:scale-[0.97] dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
              >
                {t("auth.signOut", locale)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
