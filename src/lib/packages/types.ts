export type PackageCategory = "surah" | "range" | "juz" | "theme";
export type PackageEnrollmentStatus = "active" | "paused" | "completed";

export type PackageSelector =
  | { type: "surah"; surahNumber: number }
  | { type: "range"; surahNumber: number; startAyah: number; endAyah: number }
  | { type: "juz"; juzNumber: number }
  | { type: "list"; verseKeys: string[] };

export interface MemorizationPackage {
  id: string;
  title: string;
  description: string;
  category: PackageCategory;
  starterVerseKey: string;
  selector: PackageSelector;
}

export interface MemorizationPackageRecord {
  id: string;
  title: string;
  description: string;
  category: PackageCategory;
  starter_surah_number: number;
  starter_ayah_number: number;
  selector: PackageSelector;
}

export interface UserMemorizationPackageRecord {
  package_id: string;
  status: PackageEnrollmentStatus;
  daily_new_target: number;
}
