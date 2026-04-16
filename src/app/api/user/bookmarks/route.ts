import { NextRequest, NextResponse } from "next/server";

import {
  FORBIDDEN_USER_SCOPE_ERROR,
  LINKED_IDENTITY_NOT_FOUND_ERROR,
  MISSING_LINKED_USER_ERROR,
  MISSING_REFRESH_TOKEN_ERROR,
  MISSING_USER_CREDENTIALS_ERROR,
  qfUserApiRequestForLinkedUserAuth,
} from "@/lib/qf/userApi";
import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";
import {
  checkRateLimit,
  BOOKMARK_RATE_LIMIT,
  createRateLimitResponse,
} from "@/lib/rateLimit";
import { QF_USER_BOOKMARKS_PATH } from "@/lib/config";

const BOOKMARKS_PATH = QF_USER_BOOKMARKS_PATH;

async function passthroughResponse(response: Response): Promise<NextResponse> {
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
}

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

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search;
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value ?? null;

  try {
    const response = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      `${BOOKMARKS_PATH}${search}`,
      {
        method: "GET",
      },
    );
    return passthroughResponse(response);
  } catch (error) {
    return handleProxyError(error);
  }
}

export async function POST(request: NextRequest) {
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value ?? null;

  const rateLimitCheck = checkRateLimit(
    `bookmark-post-${qfUserId ?? "anonymous"}`,
    BOOKMARK_RATE_LIMIT,
  );

  if (!rateLimitCheck.allowed) {
    return createRateLimitResponse(rateLimitCheck.resetAt);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Bookmark payload must be a JSON object" },
      { status: 400 },
    );
  }

  try {
    const response = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      BOOKMARKS_PATH,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    return passthroughResponse(response);
  } catch (error) {
    return handleProxyError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value ?? null;

  const rateLimitCheck = checkRateLimit(
    `bookmark-delete-${qfUserId ?? "anonymous"}`,
    BOOKMARK_RATE_LIMIT,
  );

  if (!rateLimitCheck.allowed) {
    return createRateLimitResponse(rateLimitCheck.resetAt);
  }

  let verseKey: string | null = null;

  try {
    const body = await request.json();
    if (typeof body === "object" && body !== null) {
      const raw = (body as Record<string, unknown>).verse_key;
      verseKey = typeof raw === "string" ? raw : null;
    }
  } catch {
    const searchParams = request.nextUrl.searchParams;
    verseKey = searchParams.get("verse_key") ?? null;
  }

  if (!verseKey) {
    return NextResponse.json(
      { message: "verse_key is required" },
      { status: 400 },
    );
  }

  try {
    const response = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      `${BOOKMARKS_PATH}/${encodeURIComponent(verseKey)}`,
      {
        method: "DELETE",
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

    return NextResponse.json(
      { message: "Bookmark deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return handleProxyError(error);
  }
}
