import { NextRequest, NextResponse } from "next/server";

import {
  QF_OAUTH_COOKIES,
  generatePkcePair,
  generateRandomToken,
  getQfOAuthConfig,
} from "@/lib/qf/oauth";

export async function GET(request: NextRequest) {
  try {
    const config = getQfOAuthConfig(request.nextUrl.origin);
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = generateRandomToken(24);
    const nonce = generateRandomToken(24);

    const params = new URLSearchParams();
    params.set("response_type", "code");
    params.set("client_id", config.clientId);
    params.set("redirect_uri", config.redirectUri);
    params.set("scope", config.scope);
    params.set("state", state);
    params.set("nonce", nonce);
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(
      `${config.authBaseUrl}/oauth2/auth?${params.toString()}`,
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 10,
    };

    response.cookies.set(QF_OAUTH_COOKIES.state, state, cookieOptions);
    response.cookies.set(QF_OAUTH_COOKIES.nonce, nonce, cookieOptions);
    response.cookies.set(
      QF_OAUTH_COOKIES.codeVerifier,
      codeVerifier,
      cookieOptions,
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start OAuth flow";

    return NextResponse.json({ message }, { status: 500 });
  }
}
