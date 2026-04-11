import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toVerseKey } from "@/lib/quranApi";

import type {
  MemorizationPackage,
  MemorizationPackageRecord,
  PackageCategory,
  PackageEnrollmentStatus,
  UserPackageEnrollment,
  UserMemorizationPackageRecord,
} from "./types";

const ALLOWED_CATEGORIES: PackageCategory[] = [
  "surah",
  "range",
  "juz",
  "theme",
];

function isValidCategory(value: string): value is PackageCategory {
  return ALLOWED_CATEGORIES.includes(value as PackageCategory);
}

function toDomainPackage(
  record: MemorizationPackageRecord,
): MemorizationPackage {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    starterVerseKey: toVerseKey(
      record.starter_surah_number,
      record.starter_ayah_number,
    ),
    selector: record.selector,
  };
}

export async function fetchPublishedMemorizationPackages(): Promise<
  MemorizationPackage[]
> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase credentials are missing");
  }

  const { data, error } = await supabase
    .from("memorization_packages")
    .select(
      "id,title,description,category,starter_surah_number,starter_ayah_number,selector",
    )
    .eq("is_published", true)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as MemorizationPackageRecord[];

  return rows
    .filter((row) => isValidCategory(row.category))
    .map((row) => toDomainPackage(row));
}

export async function fetchUserPackageEnrollments(
  userId: string,
): Promise<Record<string, UserPackageEnrollment>> {
  const _ = userId;
  void _;

  const response = await fetch("/api/user/package-enrollments", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? "Unable to load package enrollments");
  }

  const payload = (await response.json()) as {
    rows?: UserMemorizationPackageRecord[];
  };
  const rows = (payload.rows ?? []) as UserMemorizationPackageRecord[];

  return rows.reduce<Record<string, UserPackageEnrollment>>((acc, row) => {
    acc[row.package_id] = {
      status: row.status,
      dailyNewTarget: row.daily_new_target,
    };
    return acc;
  }, {});
}

export async function setUserPackageEnrollmentStatus(
  userId: string,
  packageId: string,
  status: PackageEnrollmentStatus,
): Promise<void> {
  const _ = userId;
  void _;

  const response = await fetch("/api/user/package-enrollments", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      packageId,
      status,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? "Unable to save package status");
  }
}

export async function setUserPackageDailyNewTarget(
  userId: string,
  packageId: string,
  dailyNewTarget: number,
): Promise<void> {
  if (
    !Number.isInteger(dailyNewTarget) ||
    dailyNewTarget < 0 ||
    dailyNewTarget > 50
  ) {
    throw new Error("Daily new target must be between 0 and 50");
  }

  const _ = userId;
  void _;

  const response = await fetch("/api/user/package-enrollments", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      packageId,
      dailyNewTarget,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? "Unable to save daily target");
  }
}
