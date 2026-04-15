import { NextRequest, NextResponse } from "next/server";

import {
  OAuthError,
  QF_OAUTH_COOKIES,
  exchangeAuthorizationCode,
  getQfOAuthConfig,
  resolveQfIdentity,
} from "@/lib/qf/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { migrateAllGuestDataToUser } from "@/lib/qf/guestMigration";
import { getGuestUserId } from "@/lib/guest";
import { SESSION_COOKIE_MAX_AGE } from "@/lib/config";

type OAuthErrorReason =
  | "missing_params"
  | "state_mismatch"
  | "authorization_error"
  | "token_exchange_failed"
  | "identity_resolution_failed"
  | "db_error"
  | "user_creation_failed"
  | "unknown";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete(QF_OAUTH_COOKIES.state);
  response.cookies.delete(QF_OAUTH_COOKIES.nonce);
  response.cookies.delete(QF_OAUTH_COOKIES.codeVerifier);
}

function redirectWithStatus(
  request: NextRequest,
  status: "linked" | "error",
  reason?: OAuthErrorReason,
  httpStatus?: number,
  errorCode?: string | null,
) {
  const redirectUrl = new URL("/", request.nextUrl.origin);
  redirectUrl.searchParams.set("qf_link", status);
  if (reason) {
    redirectUrl.searchParams.set("qf_link_reason", reason);
  }
  if (httpStatus !== undefined) {
    redirectUrl.searchParams.set("qf_link_http_status", String(httpStatus));
  }
  if (errorCode) {
    redirectUrl.searchParams.set("qf_link_error_code", errorCode);
  }
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const authError = request.nextUrl.searchParams.get("error");
  if (authError) {
    const response = redirectWithStatus(
      request,
      "error",
      "authorization_error",
      undefined,
      authError,
    );
    clearOAuthCookies(response);
    return response;
  }

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
    const response = redirectWithStatus(request, "error", "missing_params");
    clearOAuthCookies(response);
    return response;
  }

  if (returnedState !== storedState) {
    const response = redirectWithStatus(request, "error", "state_mismatch");
    clearOAuthCookies(response);
    return response;
  }

  let tokenPayload: Awaited<ReturnType<typeof exchangeAuthorizationCode>>;
  let identity: Awaited<ReturnType<typeof resolveQfIdentity>>;

  const config = getQfOAuthConfig(request.nextUrl.origin);

  try {
    tokenPayload = await exchangeAuthorizationCode({
      config,
      code,
      codeVerifier,
    });
  } catch (err) {
    const httpStatus = err instanceof OAuthError ? err.httpStatus : undefined;
    const errorCode =
      err instanceof OAuthError ? (err.errorCode ?? undefined) : undefined;
    const response = redirectWithStatus(
      request,
      "error",
      "token_exchange_failed",
      httpStatus,
      errorCode,
    );
    clearOAuthCookies(response);
    return response;
  }

  try {
    identity = await resolveQfIdentity({
      config,
      accessToken: tokenPayload.access_token,
      idToken: tokenPayload.id_token,
      expectedNonce: storedNonce,
    });
  } catch {
    const response = redirectWithStatus(
      request,
      "error",
      "identity_resolution_failed",
    );
    clearOAuthCookies(response);
    return response;
  }

  try {
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
      const response = redirectWithStatus(request, "error", "db_error");
      clearOAuthCookies(response);
      return response;
    }

    const { data: existingAppUser } = await supabase
      .from("app_users")
      .select("id")
      .eq("qf_user_id", identity.qfUserId)
      .single();

    const isNewUser = !existingAppUser;

    const { data: appUser, error: appUserError } = await supabase
      .from("app_users")
      .upsert(
        {
          qf_user_id: identity.qfUserId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "qf_user_id",
        },
      )
      .select("id")
      .single();

    if (appUserError || !appUser?.id) {
      const response = redirectWithStatus(
        request,
        "error",
        "user_creation_failed",
      );
      clearOAuthCookies(response);
      return response;
    }

    if (isNewUser) {
      const guestUserId = getGuestUserId();
      if (guestUserId) {
        await migrateAllGuestDataToUser(guestUserId, appUser.id);
      }
    }

    const response = redirectWithStatus(request, "linked");
    clearOAuthCookies(response);

    response.cookies.set(QF_OAUTH_COOKIES.userId, identity.qfUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });

    response.cookies.set(QF_OAUTH_COOKIES.appUserId, appUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });

    return response;
  } catch {
    const response = redirectWithStatus(request, "error", "unknown");
    clearOAuthCookies(response);
    return response;
  }
}
