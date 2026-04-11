import { NextRequest, NextResponse } from "next/server";

import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { SESSION_COOKIE_MAX_AGE, TOKEN_EXPIRY_SOON_MS } from "@/lib/config";

export async function GET(request: NextRequest) {
  const qfUserId = request.cookies.get(QF_OAUTH_COOKIES.userId)?.value;
  const appUserIdFromCookie =
    request.cookies.get(QF_OAUTH_COOKIES.appUserId)?.value ?? null;

  if (!qfUserId) {
    return NextResponse.json({ linked: false }, { status: 200 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("qf_user_identities")
      .select("qf_user_id, access_token_expires_at")
      .eq("qf_user_id", qfUserId)
      .maybeSingle();

    if (error || !data) {
      const response = NextResponse.json({ linked: false }, { status: 200 });
      response.cookies.delete(QF_OAUTH_COOKIES.userId);
      response.cookies.delete(QF_OAUTH_COOKIES.appUserId);
      return response;
    }

    const { data: appUser } = await supabase
      .from("app_users")
      .select("id")
      .eq("qf_user_id", qfUserId)
      .maybeSingle();

    const expiresAtMs = Date.parse(data.access_token_expires_at as string);
    const expiresSoon = Number.isFinite(expiresAtMs)
      ? expiresAtMs - Date.now() < TOKEN_EXPIRY_SOON_MS
      : true;

    const appUserId =
      (appUser?.id as string | undefined) ?? appUserIdFromCookie;

    const response = NextResponse.json(
      {
        linked: true,
        qfUserId,
        appUserId,
        expiresSoon,
      },
      { status: 200 },
    );

    if (appUserId) {
      response.cookies.set(QF_OAUTH_COOKIES.appUserId, appUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch {
    const response = NextResponse.json({ linked: false }, { status: 200 });
    response.cookies.delete(QF_OAUTH_COOKIES.userId);
    response.cookies.delete(QF_OAUTH_COOKIES.appUserId);
    return response;
  }
}
