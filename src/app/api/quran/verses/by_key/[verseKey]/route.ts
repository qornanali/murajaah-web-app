import { NextRequest, NextResponse } from "next/server";

import {
  FORBIDDEN_SCOPE_ERROR,
  MISSING_CREDENTIALS_ERROR,
  qfApiRequest,
} from "@/lib/qf/contentApi";

const VERSE_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=31536000";

export async function GET(
  request: NextRequest,
  context: { params: { verseKey: string } },
) {
  const verseKey = decodeURIComponent(context.params.verseKey);
  const search = request.nextUrl.search;

  try {
    const response = await qfApiRequest(
      `/verses/by_key/${encodeURIComponent(verseKey)}${search}`,
      {
        method: "GET",
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
        "Cache-Control": VERSE_CACHE_CONTROL,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    if (message === MISSING_CREDENTIALS_ERROR) {
      return NextResponse.json({ message }, { status: 500 });
    }

    if (message === FORBIDDEN_SCOPE_ERROR) {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 502 });
  }
}
