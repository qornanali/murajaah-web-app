import { NextRequest, NextResponse } from "next/server";

import { QF_OAUTH_COOKIES } from "@/lib/qf/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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
      ? expiresAtMs - Date.now() < 5 * 60 * 1000
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
        maxAge: 60 * 60 * 24 * 30,
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
