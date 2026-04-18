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
const DEFAULT_MUSHAF_ID = 1;

function parseVerseKey(
  verseKey: string,
): { surah: number; ayah: number } | null {
  const parts = verseKey.split(":");
  if (parts.length !== 2) return null;
  const surah = Number.parseInt(parts[0], 10);
  const ayah = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  return { surah, ayah };
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
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value ?? null;
  const params = new URLSearchParams(request.nextUrl.search);
  if (!params.has("mushafId")) {
    params.set("mushafId", String(DEFAULT_MUSHAF_ID));
  }
  if (!params.has("type")) {
    params.set("type", "ayah");
  }
  if (!params.has("first") && !params.has("last")) {
    params.set("first", "20");
  } else if (params.has("first")) {
    params.set("first", String(Math.min(Number(params.get("first")), 20)));
  }

  try {
    const response = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      `${BOOKMARKS_PATH}?${params.toString()}`,
      { method: "GET" },
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
    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
        key: number;
        verseNumber: number;
        createdAt?: string;
      }>;
    };
    const bookmarks = (payload.data ?? []).map((b) => ({
      verse_key: `${b.key}:${b.verseNumber}`,
      id: b.id,
      created_at: b.createdAt,
    }));
    return NextResponse.json(
      { bookmarks },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
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

  const verseKey = (body as Record<string, unknown>)?.verse_key;
  if (typeof verseKey !== "string" || !verseKey) {
    return NextResponse.json(
      { message: "verse_key is required" },
      { status: 400 },
    );
  }

  const parsed = parseVerseKey(verseKey);
  if (!parsed) {
    return NextResponse.json(
      { message: "verse_key must be in format surah:ayah (e.g. 1:1)" },
      { status: 400 },
    );
  }

  try {
    const response = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      BOOKMARKS_PATH,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: parsed.surah,
          type: "ayah",
          verseNumber: parsed.ayah,
          mushaf: DEFAULT_MUSHAF_ID,
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
      headers: { "Cache-Control": "no-store" },
    });
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
    const raw = (body as Record<string, unknown>)?.verse_key;
    verseKey = typeof raw === "string" ? raw : null;
  } catch {
    verseKey = request.nextUrl.searchParams.get("verse_key") ?? null;
  }

  if (!verseKey) {
    return NextResponse.json(
      { message: "verse_key is required" },
      { status: 400 },
    );
  }

  const parsed = parseVerseKey(verseKey);
  if (!parsed) {
    return NextResponse.json(
      { message: "verse_key must be in format surah:ayah (e.g. 1:1)" },
      { status: 400 },
    );
  }

  try {
    const listResponse = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      `${BOOKMARKS_PATH}?mushafId=${DEFAULT_MUSHAF_ID}&type=ayah&first=20`,
      { method: "GET" },
    );

    if (!listResponse.ok) {
      const text = await listResponse.text();
      return new NextResponse(text, {
        status: listResponse.status,
        headers: {
          "Content-Type":
            listResponse.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    const listData = (await listResponse.json()) as {
      data?: Array<{ id: string; key: number; verseNumber: number }>;
    };
    const bookmark = (listData.data ?? []).find(
      (b) => b.key === parsed.surah && b.verseNumber === parsed.ayah,
    );

    if (!bookmark) {
      return NextResponse.json(
        { message: "Bookmark not found" },
        { status: 404 },
      );
    }

    const deleteResponse = await qfUserApiRequestForLinkedUserAuth(
      qfUserId,
      `${BOOKMARKS_PATH}/${encodeURIComponent(bookmark.id)}`,
      { method: "DELETE" },
    );

    if (!deleteResponse.ok) {
      const text = await deleteResponse.text();
      return new NextResponse(text, {
        status: deleteResponse.status,
        headers: {
          "Content-Type":
            deleteResponse.headers.get("Content-Type") ?? "application/json",
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
