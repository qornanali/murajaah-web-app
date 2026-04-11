import { NextRequest, NextResponse } from "next/server";

import {
  QF_OAUTH_COOKIES,
  exchangeAuthorizationCode,
  getQfOAuthConfig,
  resolveQfIdentity,
} from "@/lib/qf/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete(QF_OAUTH_COOKIES.state);
  response.cookies.delete(QF_OAUTH_COOKIES.nonce);
  response.cookies.delete(QF_OAUTH_COOKIES.codeVerifier);
}

function redirectWithStatus(request: NextRequest, status: "linked" | "error") {
  const redirectUrl = new URL("/", request.nextUrl.origin);
  redirectUrl.searchParams.set("qf_link", status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");

  const storedState = request.cookies.get(QF_OAUTH_COOKIES.state)?.value;
  const storedNonce = request.cookies.get(QF_OAUTH_COOKIES.nonce)?.value;
  const codeVerifier = request.cookies.get(
    QF_OAUTH_COOKIES.codeVerifier,
  )?.value;

  if (
    !code ||
    !returnedState ||
    !storedState ||
    !storedNonce ||
    !codeVerifier
  ) {
    const response = redirectWithStatus(request, "error");
    clearOAuthCookies(response);
    return response;
  }

  if (returnedState !== storedState) {
    const response = redirectWithStatus(request, "error");
    clearOAuthCookies(response);
    return response;
  }

  try {
    const config = getQfOAuthConfig(request.nextUrl.origin);
    const tokenPayload = await exchangeAuthorizationCode({
      config,
      code,
      codeVerifier,
    });

    const identity = await resolveQfIdentity({
      config,
      accessToken: tokenPayload.access_token,
      idToken: tokenPayload.id_token,
      expectedNonce: storedNonce,
    });

    const expiresAt = new Date(Date.now() + tokenPayload.expires_in * 1000);
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("qf_user_identities").upsert(
      {
        qf_user_id: identity.qfUserId,
        qf_sub: identity.qfSub,
        access_token: tokenPayload.access_token,
        refresh_token: tokenPayload.refresh_token ?? null,
        access_token_expires_at: expiresAt.toISOString(),
        granted_scopes: tokenPayload.scope ?? "",
        token_type: tokenPayload.token_type ?? "Bearer",
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "qf_user_id",
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    const response = redirectWithStatus(request, "linked");
    clearOAuthCookies(response);

    response.cookies.set(QF_OAUTH_COOKIES.userId, identity.qfUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    const response = redirectWithStatus(request, "error");
    clearOAuthCookies(response);
    return response;
  }
}
