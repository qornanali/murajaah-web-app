import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getLinkedAppUserId } from "@/lib/qf/sessionServer";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface AyahProgressPayload {
  id: string;
  userId: string;
  surahNumber: number;
  ayahNumber: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  updatedAt: string;
}

function toUnauthorized() {
  return NextResponse.json(
    { error: "MISSING_LINKED_USER_ERROR" },
    { status: 401 },
  );
}

function toValidationError(message: string) {
  return NextResponse.json(
    { error: "VALIDATION_ERROR", message },
    { status: 400 },
  );
}

function validateAyahProgressPayload(payload: unknown): AyahProgressPayload {
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error("Invalid payload: must be an object");
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.id !== "string" || !p.id.trim()) {
    throw new Error("Invalid id: must be non-empty string");
  }

  if (typeof p.userId !== "string" || !p.userId.trim()) {
    throw new Error("Invalid userId: must be non-empty string");
  }

  if (
    !Number.isInteger(p.surahNumber) ||
    (p.surahNumber as number) < 1 ||
    (p.surahNumber as number) > 114
  ) {
    throw new Error("Invalid surah number: must be 1-114");
  }

  if (
    !Number.isInteger(p.ayahNumber) ||
    (p.ayahNumber as number) < 1 ||
    (p.ayahNumber as number) > 300
  ) {
    throw new Error("Invalid ayah number: must be 1-300");
  }

  if (
    !Number.isFinite(p.easeFactor) ||
    (p.easeFactor as number) < 1.3 ||
    (p.easeFactor as number) > 3.5
  ) {
    throw new Error("Invalid ease factor: must be 1.3-3.5");
  }

  if (
    !Number.isInteger(p.interval) ||
    (p.interval as number) < 0 ||
    (p.interval as number) > 36500
  ) {
    throw new Error("Invalid interval: must be 0-36500");
  }

  if (
    !Number.isInteger(p.repetitions) ||
    (p.repetitions as number) < 0 ||
    (p.repetitions as number) > 10000
  ) {
    throw new Error("Invalid repetitions: must be 0-10000");
  }

  if (Number.isNaN(new Date(p.nextReviewDate as string).getTime())) {
    throw new Error("Invalid next review date: must be valid ISO date");
  }

  if (Number.isNaN(new Date(p.updatedAt as string).getTime())) {
    throw new Error("Invalid updated at: must be valid ISO date");
  }

  return {
    id: p.id as string,
    userId: p.userId as string,
    surahNumber: p.surahNumber as number,
    ayahNumber: p.ayahNumber as number,
    easeFactor: p.easeFactor as number,
    interval: p.interval as number,
    repetitions: p.repetitions as number,
    nextReviewDate: p.nextReviewDate as string,
    updatedAt: p.updatedAt as string,
  };
}

export async function POST(request: NextRequest) {
  try {
    const appUserId = await getLinkedAppUserId(request);
    if (!appUserId) {
      return toUnauthorized();
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return toValidationError("Invalid JSON payload");
    }

    let validated: AyahProgressPayload;
    try {
      validated = validateAyahProgressPayload(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Validation failed";
      return toValidationError(message);
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("ayah_progress").upsert(
      {
        id: validated.id,
        user_id: appUserId,
        surah_number: validated.surahNumber,
        ayah_number: validated.ayahNumber,
        ease_factor: validated.easeFactor,
        interval: validated.interval,
        repetitions: validated.repetitions,
        next_review_date: validated.nextReviewDate,
        updated_at: validated.updatedAt,
      },
      {
        onConflict: "user_id,surah_number,ayah_number",
      },
    );

    if (error) {
      console.error("Ayah progress upsert error:", error);
      return NextResponse.json(
        { error: "UPSERT_FAILED", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ayah progress sync error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
