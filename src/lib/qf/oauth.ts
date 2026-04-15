import "server-only";

import { createHash, randomBytes } from "crypto";
import {
  QF_USER_API_BASE,
  QF_USER_AUTH_BASE,
  QF_USER_API_BASE_PATH,
  QF_USER_OAUTH_SCOPE,
  QF_USER_PROFILE_PATH,
  QF_CLIENT_ID,
  QF_CLIENT_SECRET,
} from "@/lib/config";

interface QfOAuthConfig {
  authBaseUrl: string;
  apiBaseUrl: string;
  apiBasePath: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

interface JwtPayload {
  sub?: string;
  nonce?: string;
}

interface TokenExchangePayload {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

interface QfResolvedIdentity {
  qfUserId: string;
  qfSub: string | null;
}

export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly errorCode?: string | null,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export const QF_OAUTH_COOKIES = {
  state: "qf_oauth_state",
  nonce: "qf_oauth_nonce",
  codeVerifier: "qf_oauth_code_verifier",
  userId: "qf_user_id",
  appUserId: "qf_app_user_id",
} as const;

function normalizePath(path: string, fallback: string): string {
  const normalized = path.trim() || fallback;
  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function getQfOAuthConfig(requestOrigin: string): QfOAuthConfig {
  if (!QF_CLIENT_ID || !QF_CLIENT_SECRET) {
    throw new Error("Missing Quran.com OAuth credentials");
  }

  const redirectUri =
    process.env.QF_USER_OAUTH_REDIRECT_URI?.trim() ||
    `${requestOrigin.trim().replace(/\/+$/, "")}/api/user/oauth/callback`;

  return {
    authBaseUrl: QF_USER_AUTH_BASE,
    apiBaseUrl: QF_USER_API_BASE,
    apiBasePath: normalizePath(QF_USER_API_BASE_PATH, "/user/api/v1"),
    clientId: QF_CLIENT_ID,
    clientSecret: QF_CLIENT_SECRET,
    redirectUri,
    scope: QF_USER_OAUTH_SCOPE,
  };
}

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateRandomToken(bytes = 32): string {
  return toBase64Url(randomBytes(bytes));
}

export function generatePkcePair(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = generateRandomToken(48);
  const digest = createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = toBase64Url(digest);
  return { codeVerifier, codeChallenge };
}

export function decodeJwtPayload(jwt: string): JwtPayload | null {
  const parts = jwt.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export async function exchangeAuthorizationCode(params: {
  config: QfOAuthConfig;
  code: string;
  codeVerifier: string;
}): Promise<
  Required<Pick<TokenExchangePayload, "access_token" | "expires_in">> &
    TokenExchangePayload
> {
  const { config, code, codeVerifier } = params;
  const basicToken = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
  ).toString("base64");

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", config.redirectUri);
  body.set("code_verifier", codeVerifier);

  const response = await fetch(`${config.authBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const errorCode = typeof body?.error === "string" ? body.error : null;
    throw new OAuthError(
      `OAuth token exchange failed with status ${response.status}`,
      response.status,
      errorCode,
    );
  }

  const payload = (await response.json()) as TokenExchangePayload;
  if (!payload.access_token || !payload.expires_in) {
    throw new Error("OAuth token exchange response is incomplete");
  }

  return payload as Required<
    Pick<TokenExchangePayload, "access_token" | "expires_in">
  > &
    TokenExchangePayload;
}

export async function resolveQfIdentity(params: {
  config: QfOAuthConfig;
  accessToken: string;
  idToken?: string;
  expectedNonce: string;
}): Promise<QfResolvedIdentity> {
  const { config, accessToken, idToken, expectedNonce } = params;
  const jwtPayload = idToken ? decodeJwtPayload(idToken) : null;

  if (idToken) {
    if (!jwtPayload?.nonce || jwtPayload.nonce !== expectedNonce) {
      throw new OAuthError("Invalid OAuth nonce", undefined, "nonce_mismatch");
    }
  }

  const profilePath = normalizePath(QF_USER_PROFILE_PATH, "/profile");

  let apiUserId: string | null = null;

  let profileHttpStatus: number | undefined;

  try {
    const response = await fetch(
      `${config.apiBaseUrl}${config.apiBasePath}${profilePath}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-auth-token": accessToken,
          "x-client-id": config.clientId,
        },
        cache: "no-store",
      },
    );

    profileHttpStatus = response.status;

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;

      const maybeUserId =
        (typeof payload?.user_id === "string" && payload.user_id) ||
        (typeof payload?.id === "string" && payload.id) ||
        (typeof payload?.uuid === "string" && payload.uuid) ||
        null;

      apiUserId = maybeUserId;
    } else {
      const body = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const errorCode =
        typeof body?.error === "string" ? body.error : undefined;
      throw new OAuthError(
        `QF profile API returned ${response.status}`,
        response.status,
        errorCode ?? null,
      );
    }
  } catch (err) {
    if (err instanceof OAuthError) {
      throw err;
    }
    apiUserId = null;
  }

  const qfSub = typeof jwtPayload?.sub === "string" ? jwtPayload.sub : null;
  const qfUserId = apiUserId ?? qfSub;

  if (!qfUserId) {
    throw new OAuthError(
      "Unable to resolve Quran.com user identity",
      profileHttpStatus,
      "user_id_missing",
    );
  }

  return {
    qfUserId,
    qfSub,
  };
}
