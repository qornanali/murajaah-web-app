import Image from "next/image";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n";

interface HeaderBarProps {
  locale: AppLocale;
  theme: "light" | "dark";
  isGuestMode: boolean;
  userEmail: string | undefined;
  onSetLocale: (locale: AppLocale) => void;
  onSetTheme: (theme: "light" | "dark") => void;
  onOpenInfoModal: () => void;
  onSignOut: () => Promise<void>;
}

export function HeaderBar({
  locale,
  theme,
  isGuestMode,
  userEmail,
  onSetLocale,
  onSetTheme,
  onOpenInfoModal,
  onSignOut,
}: HeaderBarProps) {
  const router = useRouter();

  const maskEmail = (email: string | undefined | null) => {
    if (!email || !email.includes("@")) {
      return "***";
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
    <div className="mb-6 w-full max-w-4xl rounded-[28px] border border-emerald-900/10 bg-white/40 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(6,78,59,0.5)] backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/35">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.svg"
            alt="Murajaah logo"
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-xl"
          />
          <div className="text-sm text-emerald-900/70 dark:text-emerald-200/80">
            <p className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
              Murajaah
            </p>
            <p>
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
            {t("common.language", locale)}:
          </span>
          <button
            type="button"
            onClick={() => onSetLocale("en")}
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
            onClick={() => onSetLocale("id")}
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
            onClick={() => onSetTheme("light")}
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
            onClick={() => onSetTheme("dark")}
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
          <button
            type="button"
            onClick={onOpenInfoModal}
            aria-label={t("page.openInfoCenter", locale)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10v6" />
              <path d="M12 7h.01" />
            </svg>
          </button>
          {isGuestMode ? (
            <button
              type="button"
              onClick={() => {
                router.push("/login?auth=1");
              }}
              className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-900/30 dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
            >
              {t("auth.signIn", locale)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="rounded-lg bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-900/30 dark:bg-emerald-100/20 dark:text-emerald-100 dark:hover:bg-emerald-100/30"
            >
              {t("auth.signOut", locale)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
