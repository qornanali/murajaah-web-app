import { NextRequest, NextResponse } from "next/server";

import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";

export async function GET(request: NextRequest) {
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value ?? null;
  const appUserId =
    request.cookies.get(QF_OAUTH_COOKIES.appUserId)?.value ?? null;

  return NextResponse.json(
    {
      linked: Boolean(qfUserId),
      qfUserId,
      appUserId,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
