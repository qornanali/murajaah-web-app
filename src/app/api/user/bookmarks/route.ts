import { NextRequest, NextResponse } from "next/server";

import {
  FORBIDDEN_USER_SCOPE_ERROR,
  MISSING_USER_CREDENTIALS_ERROR,
  qfUserApiRequest,
} from "@/lib/qf/userApi";

function normalizePath(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

const BOOKMARKS_PATH = normalizePath(
  process.env.QF_USER_BOOKMARKS_PATH,
  "/bookmarks",
);

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search;

  try {
    const response = await qfUserApiRequest(`${BOOKMARKS_PATH}${search}`, {
      method: "GET",
    });

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
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    if (message === MISSING_USER_CREDENTIALS_ERROR) {
      return NextResponse.json({ message }, { status: 500 });
    }

    if (message === FORBIDDEN_USER_SCOPE_ERROR) {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 502 });
  }
}
