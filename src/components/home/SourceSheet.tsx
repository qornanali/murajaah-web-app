import { t } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n";
import type {
  MemorizationPackage,
  PackageEnrollmentStatus,
} from "@/lib/packages/types";

interface SurahOption {
  surahNumber: number;
  label: string;
}

interface SourceSheetProps {
  locale: AppLocale;
  isOpen: boolean;
  sourceSheetTab: "surah" | "packages";
  surahSearch: string;
  packageSearch: string;
  selectedSurahNumber: number;
  filteredSurahOptions: SurahOption[];
  paginatedPackages: MemorizationPackage[];
  filteredPackagesLength: number;
  packagePage: number;
  packagePageCount: number;
  selectedPackageId: string | null;
  packageStatusById: Record<string, PackageEnrollmentStatus>;
  packageProgressById: Record<
    string,
    { totalVerses: number; reviewedVerses: number; progressPercent: number }
  >;
  packageActionId: string | null;
  packagesError: string | null;
  isGuestMode: boolean;
  onClose: () => void;
  onSetSourceSheetTab: (tab: "surah" | "packages") => void;
  onSetSurahSearch: (search: string) => void;
  onSetPackageSearch: (search: string) => void;
  onSetSelectedSurahNumber: (surahNumber: number) => void;
  onSetPackagePage: (page: number) => void;
  onOpenSurah: () => void;
  onSelectPackage: (packageId: string) => void;
  onStartPackage: (packageId: string) => Promise<void>;
}

export function SourceSheet({
  locale,
  isOpen,
  sourceSheetTab,
  surahSearch,
  packageSearch,
  selectedSurahNumber,
  filteredSurahOptions,
  paginatedPackages,
  filteredPackagesLength,
  packagePage,
  packagePageCount,
  selectedPackageId,
  packageStatusById,
  packageProgressById,
  packageActionId,
  packagesError,
  isGuestMode,
  onClose,
  onSetSourceSheetTab,
  onSetSurahSearch,
  onSetPackageSearch,
  onSetSelectedSurahNumber,
  onSetPackagePage,
  onOpenSurah,
  onSelectPackage,
  onStartPackage,
}: SourceSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-emerald-950/50 p-3 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("page.sourceSheetTitle", locale)}
        className="w-full rounded-[24px] border border-emerald-900/15 bg-white p-4 text-emerald-950 shadow-[0_24px_80px_-40px_rgba(6,78,59,0.65)] dark:border-emerald-100/15 dark:bg-emerald-950 dark:text-emerald-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">{t("page.sourceSheetTitle", locale)}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-emerald-900/15 bg-emerald-900/5 px-3 py-1 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
          >
            {t("page.closeModal", locale)}
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onSetSourceSheetTab("surah")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              sourceSheetTab === "surah"
                ? "bg-emerald-900 text-white"
                : "border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100"
            }`}
          >
            {t("page.chooseSurah", locale)}
          </button>
          <button
            type="button"
            onClick={() => onSetSourceSheetTab("packages")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              sourceSheetTab === "packages"
                ? "bg-emerald-900 text-white"
                : "border border-emerald-900/15 bg-emerald-900/5 text-emerald-900 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100"
            }`}
          >
            {t("page.learningPackages", locale)}
          </button>
        </div>

        {sourceSheetTab === "surah" ? (
          <div className="mt-4 space-y-3">
            <input
              type="search"
              value={surahSearch}
              onChange={(event) => onSetSurahSearch(event.target.value)}
              placeholder={t("page.searchSurah", locale)}
              className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex-1">
                <span className="sr-only">{t("page.chooseSurah", locale)}</span>
                <select
                  value={selectedSurahNumber}
                  onChange={(event) => {
                    onSetSelectedSurahNumber(Number(event.target.value));
                  }}
                  className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
                >
                  {filteredSurahOptions.map((option) => (
                    <option key={option.surahNumber} value={option.surahNumber}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  onOpenSurah();
                  onClose();
                }}
                className="rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                {t("page.openSurah", locale)}
              </button>
            </div>

            {filteredSurahOptions.length === 0 ? (
              <p className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
                {t("page.noSurahMatch", locale)}
              </p>
            ) : null}
          </div>
        ) : null}

        {sourceSheetTab === "packages" ? (
          <div className="mt-4 space-y-3">
            <input
              type="search"
              value={packageSearch}
              onChange={(event) => onSetPackageSearch(event.target.value)}
              placeholder={t("page.searchPackage", locale)}
              className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-emerald-100/15 dark:bg-emerald-950/60 dark:text-emerald-100"
            />

            {isGuestMode ? (
              <p className="text-xs text-emerald-900/70 dark:text-emerald-200/80">
                {t("page.guestPackageStatusNote", locale)}
              </p>
            ) : null}

            {packagesError ? (
              <div className="rounded-xl border border-rose-700/30 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-300/25 dark:bg-rose-950/40 dark:text-rose-100">
                {packagesError}
              </div>
            ) : null}

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {paginatedPackages.map((item) => {
                const isSelected = item.id === selectedPackageId;
                const status = packageStatusById[item.id];
                const packageProgress = packageProgressById[item.id] ?? {
                  totalVerses: 0,
                  reviewedVerses: 0,
                  progressPercent: 0,
                };
                const isBusy = packageActionId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isSelected
                        ? "border-emerald-900 bg-emerald-900 text-white shadow-md"
                        : "border-emerald-900/25 bg-white text-emerald-900 dark:border-emerald-200/15 dark:bg-emerald-950/45 dark:text-emerald-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPackage(item.id);
                        onClose();
                      }}
                      className="w-full text-left"
                    >
                      <p className="font-semibold">{item.title}</p>
                      <p
                        className={
                          isSelected
                            ? "text-emerald-50/90"
                            : "text-emerald-900/70"
                        }
                      >
                        {item.description}
                      </p>
                      <p
                        className={`mt-1 ${
                          isSelected
                            ? "text-emerald-50/90"
                            : "text-emerald-900/70"
                        }`}
                      >
                        {t("page.progress", locale)}:{" "}
                        {packageProgress.progressPercent}% ({" "}
                        {packageProgress.reviewedVerses}/{" "}
                        {packageProgress.totalVerses})
                      </p>
                      <div
                        className={`mt-2 h-2 overflow-hidden rounded-full ${
                          isSelected
                            ? "bg-white/20"
                            : "bg-emerald-900/10 dark:bg-emerald-100/10"
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ${
                            isSelected ? "bg-white" : "bg-emerald-700"
                          }`}
                          style={{
                            width: `${Math.max(4, packageProgress.progressPercent)}%`,
                          }}
                        />
                      </div>
                    </button>

                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void onStartPackage(item.id);
                        }}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-emerald-900 text-white hover:bg-emerald-800"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {status === "active"
                          ? t("page.resume", locale)
                          : t("page.start", locale)}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredPackagesLength === 0 && !packagesError ? (
                <div className="rounded-lg border border-emerald-900/25 bg-white p-3 text-emerald-900/70 dark:border-emerald-200/25 dark:bg-emerald-900/40 dark:text-emerald-200/80">
                  {packageSearch
                    ? t("page.noPackageMatch", locale)
                    : t("page.noPublishedPackages", locale)}
                </div>
              ) : null}
            </div>

            {filteredPackagesLength > 0 ? (
              <div className="flex items-center justify-between pt-1 text-xs">
                <p className="text-emerald-900/75 dark:text-emerald-200/75">
                  {t("page.page", locale)} {packagePage} {t("page.of", locale)}{" "}
                  {packagePageCount}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={packagePage <= 1}
                    onClick={() =>
                      onSetPackagePage(Math.max(1, packagePage - 1))
                    }
                    className="rounded-md border border-emerald-900/15 bg-emerald-900/5 px-2.5 py-1 font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
                  >
                    {t("page.prev", locale)}
                  </button>
                  <button
                    type="button"
                    disabled={packagePage >= packagePageCount}
                    onClick={() =>
                      onSetPackagePage(Math.min(packagePageCount, packagePage + 1))
                    }
                    className="rounded-md border border-emerald-900/15 bg-emerald-900/5 px-2.5 py-1 font-semibold text-emerald-900 transition-colors hover:bg-emerald-900/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-100/15 dark:bg-emerald-100/5 dark:text-emerald-100 dark:hover:bg-emerald-100/10"
                  >
                    {t("page.next", locale)}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
