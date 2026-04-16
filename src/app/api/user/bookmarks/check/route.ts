import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";
import {
  qfUserApiRequestForLinkedUserAuth,
  MISSING_LINKED_USER_ERROR,
  LINKED_IDENTITY_NOT_FOUND_ERROR,
  MISSING_REFRESH_TOKEN_ERROR,
  FORBIDDEN_USER_SCOPE_ERROR,
  MISSING_USER_CREDENTIALS_ERROR,
} from "@/lib/qf/userApi";
import {
  checkRateLimit,
  BOOKMARK_RATE_LIMIT,
  createRateLimitResponse,
} from "@/lib/rateLimit";

function handleProxyError(error: unknown): NextResponse {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";

  if (message === MISSING_USER_CREDENTIALS_ERROR) {
    return NextResponse.json({ message }, { status: 500 });
  }

  if (
    message === MISSING_LINKED_USER_ERROR ||
    message === LINKED_IDENTITY_NOT_FOUND_ERROR ||
    message === MISSING_REFRESH_TOKEN_ERROR
  ) {
    return NextResponse.json({ message }, { status: 401 });
  }

  if (message === FORBIDDEN_USER_SCOPE_ERROR) {
    return NextResponse.json({ message }, { status: 403 });
  }

  return NextResponse.json({ message }, { status: 502 });
}

export async function POST(request: NextRequest) {
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value ?? null;

  const rateLimitCheck = checkRateLimit(
    `bookmark-check-${qfUserId ?? "anonymous"}`,
    BOOKMARK_RATE_LIMIT,
  );

  if (!rateLimitCheck.allowed) {
    return createRateLimitResponse(rateLimitCheck.resetAt);
  }

  let verseKeys: string[] = [];

  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      verseKeys = body.filter((v) => typeof v === "string");
    } else if (typeof body === "object" && body !== null) {
      const verse_key = (body as Record<string, unknown>).verse_key;
      if (typeof verse_key === "string") {
        verseKeys = [verse_key];
      } else if (Array.isArray(body.verse_keys)) {
        verseKeys = (body.verse_keys as unknown[]).filter(
          (v): v is string => typeof v === "string",
        );
      }
    }
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (verseKeys.length === 0) {
    return NextResponse.json(
      { message: "verse_key or verse_keys array is required" },
      { status: 400 },
    );
  }

  try {
    const response = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      "/bookmarks/check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verse_keys: verseKeys,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    const payload = await response.json();
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleProxyError(error);
  }
}
