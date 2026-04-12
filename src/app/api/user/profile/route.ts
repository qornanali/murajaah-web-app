import { NextRequest, NextResponse } from "next/server";

import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";
import { qfUserApiRequestForLinkedUser } from "@/lib/qf/userApi";
import { QF_USER_PROFILE_PATH } from "@/lib/config";

function getString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function resolveDisplayName(
  profile: Record<string, unknown>,
  qfUserId: string,
): string {
  const fullName =
    getString(profile, "name") ??
    getString(profile, "full_name") ??
    getString(profile, "fullName");

  const firstName =
    getString(profile, "first_name") ??
    getString(profile, "firstName") ??
    getString(profile, "given_name");

  const lastName =
    getString(profile, "last_name") ??
    getString(profile, "lastName") ??
    getString(profile, "family_name");

  const mergedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const handle =
    getString(profile, "username") ??
    getString(profile, "user_name") ??
    getString(profile, "email");

  return fullName ?? (mergedName || null) ?? handle ?? qfUserId;
}

export async function GET(request: NextRequest) {
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value ?? null;

  if (!qfUserId) {
    return NextResponse.json(
      { message: "Quran.com account not linked" },
      { status: 401 },
    );
  }

  try {
    const response = await qfUserApiRequestForLinkedUser(
      qfUserId,
      QF_USER_PROFILE_PATH,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      return NextResponse.json(
        { message: errorPayload?.message ?? "Failed to fetch profile" },
        { status: response.status },
      );
    }

    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    const source =
      payload && typeof payload.data === "object" && payload.data !== null
        ? (payload.data as Record<string, unknown>)
        : payload;

    if (!source) {
      return NextResponse.json(
        {
          qfUserId,
          displayName: qfUserId,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        qfUserId,
        displayName: resolveDisplayName(source, qfUserId),
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json({ message }, { status: 500 });
  }
}
