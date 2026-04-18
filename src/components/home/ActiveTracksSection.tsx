import { BookOpen, Play, RotateCcw } from "lucide-react";

import { t } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n";

export interface ActiveTrackItem {
  id: string;
  kind: "package" | "surah";
  title: string;
  subtitle: string;
  progressPercent: number;
  reviewedVerses: number;
  totalVerses: number;
  isSelected: boolean;
  isBusy: boolean;
}

interface ActiveTracksSectionProps {
  locale: AppLocale;
  tracks: ActiveTrackItem[];
  isLoading?: boolean;
  onAddTracks: () => void;
  onPlayTrack: (track: ActiveTrackItem) => void;
  onResetTrack: (track: ActiveTrackItem) => void;
}

export function ActiveTracksSection({
  locale,
  tracks,
  isLoading,
  onAddTracks,
  onPlayTrack,
  onResetTrack,
}: ActiveTracksSectionProps) {
  return (
    <section className="rounded-[32px] border border-emerald-900/15 bg-white/55 p-4 shadow-[0_24px_70px_-42px_rgba(6,78,59,0.42)] backdrop-blur-sm dark:border-emerald-200/15 dark:bg-emerald-950/50 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
          {t("page.activeTracksTitle", locale)}
        </p>
        <button
          type="button"
          onClick={onAddTracks}
          className="rounded-full border border-emerald-900/15 bg-emerald-900/5 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-all duration-200 hover:bg-emerald-900/10 active:scale-95 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
        >
          + {t("page.addTracks", locale)}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-[22px] border border-emerald-900/15 bg-white/70 px-3 py-3 dark:border-emerald-200/15 dark:bg-emerald-950/55"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-2xl bg-emerald-900/10 dark:bg-emerald-100/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 rounded bg-emerald-900/10 dark:bg-emerald-100/10" />
                  <div className="h-3 w-1/3 rounded bg-emerald-900/10 dark:bg-emerald-100/10" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-900/10 dark:bg-emerald-100/10" />
                  <div className="h-8 w-8 rounded-xl bg-emerald-900/10 dark:bg-emerald-100/10" />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-emerald-900/10 dark:bg-emerald-100/10" />
              </div>
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-emerald-900/20 bg-white/60 px-4 py-6 text-center text-sm text-emerald-900/75 dark:border-emerald-100/20 dark:bg-emerald-950/40 dark:text-emerald-100/80">
          {t("page.noActiveTracks", locale)}
        </div>
      ) : (
        <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
          {tracks.map((track) => {
            const progressWidth = `${Math.max(4, track.progressPercent)}%`;
            const kindLabel =
              track.kind === "package"
                ? t("page.trackTypePackage", locale)
                : t("page.trackTypeSurah", locale);

            return (
              <article
                key={track.id}
                className={`rounded-[22px] border px-3 py-3 transition-all duration-300 ${
                  track.isSelected
                    ? "border-emerald-900 bg-emerald-900 text-white shadow-[0_12px_36px_-24px_rgba(6,78,59,0.9)] dark:border-emerald-300"
                    : "border-emerald-900/15 bg-white/70 text-emerald-950 shadow-[0_16px_32px_-26px_rgba(6,78,59,0.45)] dark:border-emerald-200/15 dark:bg-emerald-950/55 dark:text-emerald-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      track.isSelected
                        ? "bg-white/15"
                        : "bg-emerald-900/10 dark:bg-emerald-100/10"
                    }`}
                  >
                    <BookOpen className="h-5 w-5" strokeWidth={2.3} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{track.title}</p>
                    <p
                      className={`truncate text-[11px] ${
                        track.isSelected
                          ? "text-emerald-50/90"
                          : "text-emerald-900/70 dark:text-emerald-100/75"
                      }`}
                    >
                      {kindLabel} · {track.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={track.isBusy}
                      onClick={() => onResetTrack(track)}
                      aria-label={t("page.trackReset", locale)}
                      className={`rounded-xl px-2.5 py-2 transition-all duration-200 active:scale-95 ${
                        track.isSelected
                          ? "bg-white/12 text-white hover:bg-white/20"
                          : "bg-emerald-900/10 text-emerald-900 hover:bg-emerald-900/15 dark:bg-emerald-100/10 dark:text-emerald-100 dark:hover:bg-emerald-100/15"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={track.isBusy}
                      onClick={() => onPlayTrack(track)}
                      aria-label={t("page.trackPlay", locale)}
                      className={`rounded-xl px-2.5 py-2 transition-all duration-200 active:scale-95 ${
                        track.isSelected
                          ? "bg-white text-emerald-900 hover:bg-emerald-50"
                          : "bg-emerald-900 text-white hover:bg-emerald-800 dark:bg-emerald-200 dark:text-emerald-950 dark:hover:bg-emerald-100"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <div
                    className={`h-2 overflow-hidden rounded-full ${
                      track.isSelected
                        ? "bg-white/20"
                        : "bg-emerald-900/10 dark:bg-emerald-100/10"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${
                        track.isSelected ? "bg-white" : "bg-emerald-700"
                      }`}
                      style={{ width: progressWidth }}
                    />
                  </div>
                  <p
                    className={`mt-1.5 text-[11px] ${
                      track.isSelected
                        ? "text-emerald-50/90"
                        : "text-emerald-900/70 dark:text-emerald-100/75"
                    }`}
                  >
                    {t("page.progress", locale)}: {track.progressPercent}% ({track.reviewedVerses}/{track.totalVerses})
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
