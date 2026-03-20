import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toVerseKey } from "@/lib/quranApi";

import type {
  MemorizationPackage,
  MemorizationPackageRecord,
  PackageCategory,
  PackageEnrollmentStatus,
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
): Promise<Record<string, PackageEnrollmentStatus>> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase credentials are missing");
  }

  const { data, error } = await supabase
    .from("user_memorization_packages")
    .select("package_id,status,daily_new_target")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as UserMemorizationPackageRecord[];

  return rows.reduce<Record<string, PackageEnrollmentStatus>>((acc, row) => {
    acc[row.package_id] = row.status;
    return acc;
  }, {});
}

export async function setUserPackageEnrollmentStatus(
  userId: string,
  packageId: string,
  status: PackageEnrollmentStatus,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase credentials are missing");
  }

  const { error } = await supabase.from("user_memorization_packages").upsert(
    {
      user_id: userId,
      package_id: packageId,
      status,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,package_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}
