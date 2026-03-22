import { NextRequest, NextResponse } from "next/server";

import {
  FORBIDDEN_SCOPE_ERROR,
  MISSING_CREDENTIALS_ERROR,
  qfApiRequest,
} from "@/lib/qf/contentApi";

function parseNonNegativeInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

const CACHE_MAX_AGE = parseNonNegativeInt(process.env.QF_CACHE_MAX_AGE, 3600);
const CACHE_S_MAXAGE_VERSES = parseNonNegativeInt(
  process.env.QF_CACHE_S_MAXAGE_VERSES,
  2592000,
);
const CACHE_SWR_VERSES = parseNonNegativeInt(
  process.env.QF_CACHE_SWR_VERSES,
  31536000,
);

const VERSE_CACHE_CONTROL = `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_S_MAXAGE_VERSES}, stale-while-revalidate=${CACHE_SWR_VERSES}`;

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
