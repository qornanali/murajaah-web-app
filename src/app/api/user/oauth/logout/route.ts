import { NextResponse } from "next/server";

import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });

  response.cookies.delete(QF_OAUTH_COOKIES.userId);
  response.cookies.delete(QF_OAUTH_COOKIES.appUserId);
  response.cookies.delete(QF_OAUTH_COOKIES.state);
  response.cookies.delete(QF_OAUTH_COOKIES.nonce);
  response.cookies.delete(QF_OAUTH_COOKIES.codeVerifier);

  return response;
}
