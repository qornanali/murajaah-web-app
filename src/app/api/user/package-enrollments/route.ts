import { NextRequest, NextResponse } from "next/server";

import type { PackageEnrollmentStatus } from "@/lib/packages/types";
import { getLinkedAppUserId } from "@/lib/qf/sessionServer";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const VALID_STATUS: PackageEnrollmentStatus[] = [
  "active",
  "paused",
  "completed",
];

function toUnauthorized() {
  return NextResponse.json(
    { message: "Quran.com account is not linked." },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  const appUserId = await getLinkedAppUserId(request);
  if (!appUserId) {
    return toUnauthorized();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_memorization_packages")
    .select("package_id,status,daily_new_target")
    .eq("user_id", appUserId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] }, { status: 200 });
}

export async function PUT(request: NextRequest) {
  const appUserId = await getLinkedAppUserId(request);
  if (!appUserId) {
    return toUnauthorized();
  }

  const body = (await request.json().catch(() => null)) as {
    packageId?: string;
    status?: PackageEnrollmentStatus;
    dailyNewTarget?: number;
  } | null;

  const packageId = body?.packageId?.trim();
  const status = body?.status;
  const dailyNewTarget = body?.dailyNewTarget;

  if (!packageId) {
    return NextResponse.json(
      { message: "Invalid package id" },
      { status: 400 },
    );
  }

  if (status && !VALID_STATUS.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  if (
    dailyNewTarget !== undefined &&
    (!Number.isInteger(dailyNewTarget) ||
      dailyNewTarget < 0 ||
      dailyNewTarget > 50)
  ) {
    return NextResponse.json(
      { message: "Invalid daily new target" },
      { status: 400 },
    );
  }

  const upsertPayload: {
    user_id: string;
    package_id: string;
    updated_at: string;
    status?: PackageEnrollmentStatus;
    daily_new_target?: number;
  } = {
    user_id: appUserId,
    package_id: packageId,
    updated_at: new Date().toISOString(),
  };

  if (status) {
    upsertPayload.status = status;
  }

  if (dailyNewTarget !== undefined) {
    upsertPayload.daily_new_target = dailyNewTarget;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("user_memorization_packages")
    .upsert(upsertPayload, {
      onConflict: "user_id,package_id",
    });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
