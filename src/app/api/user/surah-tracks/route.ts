import { NextRequest, NextResponse } from "next/server";

import { getLinkedAppUserId } from "@/lib/qf/sessionServer";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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
    .from("user_surah_tracks")
    .select("surah_number")
    .eq("user_id", appUserId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const tracks = (data ?? []).map((row) => row.surah_number as number);
  return NextResponse.json({ tracks }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const appUserId = await getLinkedAppUserId(request);
  if (!appUserId) {
    return toUnauthorized();
  }

  const body = (await request.json().catch(() => null)) as {
    surahNumber?: number;
  } | null;

  const surahNumber = body?.surahNumber;
  if (
    !Number.isInteger(surahNumber) ||
    (surahNumber as number) < 1 ||
    (surahNumber as number) > 114
  ) {
    return NextResponse.json(
      { message: "Invalid surah number" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("user_surah_tracks").upsert(
    {
      user_id: appUserId,
      surah_number: surahNumber,
    },
    {
      onConflict: "user_id,surah_number",
      ignoreDuplicates: true,
    },
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const appUserId = await getLinkedAppUserId(request);
  if (!appUserId) {
    return toUnauthorized();
  }

  const body = (await request.json().catch(() => null)) as {
    surahNumber?: number;
  } | null;

  const surahNumber = body?.surahNumber;
  if (
    !Number.isInteger(surahNumber) ||
    (surahNumber as number) < 1 ||
    (surahNumber as number) > 114
  ) {
    return NextResponse.json(
      { message: "Invalid surah number" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("user_surah_tracks")
    .delete()
    .eq("user_id", appUserId)
    .eq("surah_number", surahNumber);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
