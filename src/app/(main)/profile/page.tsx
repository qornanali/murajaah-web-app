"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User, BookOpen, Zap, BarChart2, Users, Shield, MessageSquare } from "lucide-react";

import { t } from "@/lib/i18n";
import { useLocaleStore } from "@/store/localeStore";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { getGuestUserId } from "@/lib/guest";
import {
  fetchQfSessionStatus,
  type QfSessionStatus,
} from "@/lib/qf/sessionBrowser";
import {
  fetchLinkedUserProfile,
} from "@/lib/qf/userBrowser";
import {
  fetchUserPackageEnrollments,
} from "@/lib/packages/api";
import { type PackageEnrollmentStatus } from "@/lib/packages/types";
import { murajaahDB } from "@/lib/offline/db";
import { toVerseKey } from "@/lib/quranApi";

const GUEST_PACKAGE_STATUS_PREFIX = "murajaah.guest.packageStatus";

function AccordionSection({
  title,
  content,
  defaultOpen = false,
  icon,
  iconBg = "bg-emerald-100 dark:bg-emerald-900/50",
  iconColor = "text-emerald-700 dark:text-emerald-400",
}: {
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white/65 shadow-[0_4px_16px_-8px_rgba(6,78,59,0.1)] transition-all duration-200 dark:border-emerald-100/10 dark:bg-emerald-950/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition-all duration-200 hover:bg-emerald-900/[0.03] active:bg-emerald-900/[0.06] dark:hover:bg-emerald-100/[0.03]"
        aria-expanded={open}
      >
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
            {icon}
          </span>
        )}
        <span className="flex-1 font-semibold text-emerald-950 dark:text-emerald-100">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-emerald-900/40 transition-transform duration-300 dark:text-emerald-200/40 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-emerald-900/[0.06] px-4 pb-4 pt-3 text-sm text-emerald-900/80 dark:border-emerald-100/[0.06] dark:text-emerald-200/80">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const initializeLocale = useLocaleStore((state) => state.initializeLocale);
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const user = useAuthStore((state) => state.user);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const signOut = useAuthStore((state) => state.signOut);

  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [qfSession, setQfSession] = useState<QfSessionStatus>({
    linked: false,
    qfUserId: null,
    appUserId: null,
  });
  const [qfDisplayName, setQfDisplayName] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [activePackagesCount, setActivePackagesCount] = useState(0);
  const [completedPackagesCount, setCompletedPackagesCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [averageEF, setAverageEF] = useState<number | null>(null);
  const [newToday, setNewToday] = useState(0);

  const persistedUserId = user?.id ?? qfSession.appUserId;
  const isGuestMode = !persistedUserId && Boolean(guestUserId);
  const activeUserId = persistedUserId ?? guestUserId;

  useEffect(() => {
    void initializeAuth();
    initializeLocale();
    initializeTheme();
    setGuestUserId(getGuestUserId());
  }, [initializeAuth, initializeLocale, initializeTheme]);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    const load = async () => {
      const status = await fetchQfSessionStatus();
      setQfSession(status);
    };
    void load();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!qfSession.linked) {
        setQfDisplayName(null);
        return;
      }
      const profile = await fetchLinkedUserProfile();
      if (profile.ok) {
        setQfDisplayName(profile.displayName ?? profile.qfUserId ?? null);
      } else {
        setQfDisplayName(qfSession.qfUserId);
      }
    };
    void load();
  }, [qfSession.linked, qfSession.qfUserId]);

  useEffect(() => {
    const load = async () => {
      if (!activeUserId) return;

      const allRows = await murajaahDB.ayahProgress
        .toCollection()
        .filter((row) => row.userId === activeUserId)
        .toArray();

      const reviewed = new Set<string>();
      const newTodaySet = new Set<string>();
      const startOfDay = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
      ).toISOString();

      const now = new Date().toISOString();
      let dueNow = 0;

      allRows.forEach((row) => {
        reviewed.add(toVerseKey(row.surahNumber, row.ayahNumber));
        if (row.updatedAt >= startOfDay && row.repetitions <= 1) {
          newTodaySet.add(toVerseKey(row.surahNumber, row.ayahNumber));
        }
        if (row.nextReviewDate <= now) dueNow++;
      });

      setTotalReviewed(reviewed.size);
      setNewToday(newTodaySet.size);
      setDueCount(dueNow);
      setAverageEF(
        allRows.length > 0
          ? Number((allRows.reduce((s, r) => s + r.easeFactor, 0) / allRows.length).toFixed(2))
          : null,
      );
    };
    void load();
  }, [activeUserId]);

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!persistedUserId && !guestUserId) return;

      let statusMap: Record<string, PackageEnrollmentStatus> = {};

      if (!persistedUserId && guestUserId) {
        const raw = window.localStorage.getItem(
          `${GUEST_PACKAGE_STATUS_PREFIX}.${guestUserId}`,
        );
        if (raw) {
          try { statusMap = JSON.parse(raw) as Record<string, PackageEnrollmentStatus>; }
          catch { statusMap = {}; }
        }
      } else if (persistedUserId) {
        try {
          const map = await fetchUserPackageEnrollments(persistedUserId);
          statusMap = Object.entries(map).reduce<Record<string, PackageEnrollmentStatus>>(
            (acc, [id, e]) => { acc[id] = e.status; return acc; },
            {},
          );
        } catch { statusMap = {}; }
      }

      const values = Object.values(statusMap);
      setActivePackagesCount(values.filter((s) => s === "active").length);
      setCompletedPackagesCount(values.filter((s) => s === "completed").length);
    };
    void loadEnrollments();
  }, [persistedUserId, guestUserId]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      if (user) await signOut();
      await fetch("/api/user/oauth/logout", { method: "POST" });
    } finally {
      setIsSigningOut(false);
      router.push("/");
    }
  };

  const displayName =
    user?.email ?? qfDisplayName ?? qfSession.qfUserId ?? undefined;

  const maskEmail = (email: string | undefined) => {
    if (!email || !email.includes("@")) return email ?? "***";
    const [local, domain] = email.split("@");
    const first = local.slice(0, 1);
    const last = local.length > 1 ? local.slice(-1) : "";
    const masked = "*".repeat(Math.max((local?.length ?? 0) - 2, 2));
    return `${first}${masked}${last}@${domain}`;
  };

  const statItems = [
    { label: t("page.totalReviewedVerses", locale), value: `${totalReviewed}` },
    { label: t("page.newToday", locale), value: `${newToday}` },
    { label: t("page.dueNow", locale), value: `${dueCount}` },
    { label: t("page.activePackagesCount", locale), value: `${activePackagesCount}` },
    { label: t("page.completedPackagesCount", locale), value: `${completedPackagesCount}` },
    { label: t("page.averageEf", locale), value: averageEF?.toFixed(2) ?? "–" },
  ];

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="animate-slide-up mb-2">
          <div className="flex items-center gap-3 rounded-[28px] border border-emerald-900/10 bg-white/40 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(6,78,59,0.35)] backdrop-blur-sm dark:border-emerald-100/10 dark:bg-emerald-950/35">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-900/8 dark:bg-emerald-100/10">
              <User className="h-5 w-5 text-emerald-800 dark:text-emerald-300" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Profile</h1>
              <p className="text-xs text-emerald-900/55 dark:text-emerald-200/55">
                {isGuestMode ? t("page.localOnly", locale) : t("auth.loggedInAs", locale)}
              </p>
            </div>
          </div>
        </div>

        {/* Account hero card */}
        <div className="animate-slide-up-delay-1 overflow-hidden rounded-[24px] border border-emerald-900/10 shadow-[0_12px_40px_-16px_rgba(6,78,59,0.22)] dark:border-emerald-100/10">
          <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 px-5 py-6">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 left-12 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/20">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                {isGuestMode ? (
                  <>
                    <p className="font-bold text-white">
                      {t("page.guestMode", locale)}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-200/70">
                      {t("page.localOnly", locale)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-0.5 text-xs text-emerald-200/70">
                      {t("auth.loggedInAs", locale)}
                    </p>
                    <p className="truncate font-bold text-white">
                      {maskEmail(displayName)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/65 px-5 py-4 dark:bg-emerald-950/50">
            {isGuestMode ? (
              <button
                type="button"
                onClick={() => router.push("/login?auth=1")}
                className="w-full rounded-xl bg-emerald-900 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-800 active:scale-[0.98] dark:bg-emerald-500 dark:text-emerald-950"
              >
                {t("auth.signIn", locale)}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-700/20 bg-rose-50 py-2.5 text-sm font-semibold text-rose-700 transition-all duration-200 hover:bg-rose-100 active:scale-[0.98] disabled:opacity-60 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? t("auth.pleaseWait", locale) : t("auth.signOut", locale)}
              </button>
            )}
          </div>
        </div>

        <div className="animate-slide-up-delay-2 space-y-2">
          <AccordionSection
            title={t("page.sourceTab", locale)}
            defaultOpen
            icon={<BookOpen className="h-4 w-4" />}
            iconBg="bg-sky-100 dark:bg-sky-900/40"
            iconColor="text-sky-700 dark:text-sky-400"
            content={
              <div className="space-y-2">
                <p className="font-medium text-emerald-950 dark:text-emerald-100">
                  {t("page.dataSource", locale)}
                </p>
                <p className="text-emerald-900/75 dark:text-emerald-200/75">
                  {t("page.sourceDescription", locale)}
                </p>
                <p>
                  <a
                    href="https://quran.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                  >
                    Quran.com
                  </a>{" "}
                  · {t("page.quranTextSource", locale)}
                </p>
              </div>
            }
          />

          <AccordionSection
            title={t("page.methodology", locale)}
            icon={<Zap className="h-4 w-4" />}
            iconBg="bg-amber-100 dark:bg-amber-900/40"
            iconColor="text-amber-700 dark:text-amber-400"
            content={
              <div className="space-y-3">
                <p className="font-medium text-emerald-950 dark:text-emerald-100">
                  {t("page.learnAboutMethodology", locale)}
                </p>
                {[
                  t("page.methodologyStep1", locale),
                  t("page.methodologyStep2", locale),
                  t("page.methodologyStep3", locale),
                ].map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      {i + 1}
                    </span>
                    <p className="text-emerald-900/75 dark:text-emerald-200/75">
                      {step}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-emerald-900/60 dark:text-emerald-200/60">
                  {t("page.ankiInspired", locale)}{" "}
                  <a
                    href="https://apps.ankiweb.net"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {t("page.ankiLink", locale)}
                  </a>
                </p>
              </div>
            }
          />

          <AccordionSection
            title={t("page.statsTab", locale)}
            icon={<BarChart2 className="h-4 w-4" />}
            iconBg="bg-violet-100 dark:bg-violet-900/40"
            iconColor="text-violet-700 dark:text-violet-400"
            content={
              <div className="space-y-3">
                <p className="text-emerald-900/70 dark:text-emerald-200/70">
                  {t("page.statsDescription", locale)}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {statItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3 dark:border-emerald-100/10 dark:bg-emerald-900/20"
                    >
                      <p className="text-[11px] font-medium leading-tight text-emerald-900/60 dark:text-emerald-200/60">
                        {item.label}
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-950 dark:text-emerald-100">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          <AccordionSection
            title={t("page.creditTab", locale)}
            icon={<Users className="h-4 w-4" />}
            iconBg="bg-pink-100 dark:bg-pink-900/40"
            iconColor="text-pink-700 dark:text-pink-400"
            content={
              <div className="space-y-2">
                <p className="text-emerald-900/75 dark:text-emerald-200/75">
                  {t("page.creditDescription", locale)}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-900/8 bg-emerald-50/50 px-3 py-2 dark:border-emerald-100/8 dark:bg-emerald-900/20">
                    <span className="font-medium text-emerald-950 dark:text-emerald-100">Ali Qornan</span>
                    <div className="flex gap-2 text-xs">
                      <a href="https://github.com/qornanali" target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">GitHub</a>
                      <span className="text-emerald-900/30">·</span>
                      <a href="https://www.linkedin.com/in/aliqornan/" target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">LinkedIn</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-900/8 bg-emerald-50/50 px-3 py-2 dark:border-emerald-100/8 dark:bg-emerald-900/20">
                    <span className="font-medium text-emerald-950 dark:text-emerald-100">Muhammad Jafar</span>
                    <div className="flex gap-2 text-xs">
                      <a href="https://github.com/mhmmdjafarg" target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">GitHub</a>
                      <span className="text-emerald-900/30">·</span>
                      <a href="https://www.linkedin.com/in/mhmmdjafarg/" target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">LinkedIn</a>
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          <AccordionSection
            title={t("page.legalTab", locale)}
            icon={<Shield className="h-4 w-4" />}
            iconBg="bg-slate-100 dark:bg-slate-800/60"
            iconColor="text-slate-600 dark:text-slate-400"
            content={
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-emerald-950 dark:text-emerald-100">
                    {t("page.privacyTitle", locale)}
                  </p>
                  <p className="mt-1 text-emerald-900/75 dark:text-emerald-200/75">
                    {t("page.privacyBody", locale)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-emerald-950 dark:text-emerald-100">
                    {t("page.termsTitle", locale)}
                  </p>
                  <p className="mt-1 text-emerald-900/75 dark:text-emerald-200/75">
                    {t("page.termsBody", locale)}
                  </p>
                </div>
              </div>
            }
          />

          <AccordionSection
            title={t("page.feedbackTab", locale)}
            icon={<MessageSquare className="h-4 w-4" />}
            iconBg="bg-teal-100 dark:bg-teal-900/40"
            iconColor="text-teal-700 dark:text-teal-400"
            content={
              <div className="space-y-3">
                <p className="text-emerald-900/75 dark:text-emerald-200/75">
                  {t("page.feedbackDescription", locale)}
                </p>
                <a
                  href="https://forms.gle/zwdDtmFTQs2pARxK8"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-800 active:scale-95 dark:bg-emerald-500 dark:text-emerald-950"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t("page.feedbackCta", locale)}
                </a>
              </div>
            }
          />
        </div>
      </div>
    </main>
  );
}
