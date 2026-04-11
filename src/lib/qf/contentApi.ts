import "server-only";

import {
  TOKEN_EXPIRY_BUFFER_MS,
  QF_API_BASE,
  QF_AUTH_BASE,
  QF_CONTENT_SCOPE,
  QF_CLIENT_ID,
  QF_CLIENT_SECRET,
} from "@/lib/config";

const MISSING_CREDENTIALS_ERROR =
  "Missing Quran Foundation API credentials. Request access: https://api-docs.quran.foundation/request-access";

const FORBIDDEN_SCOPE_ERROR =
  "Quran Foundation API request forbidden (403). Ensure scope=content and permission access is enabled.";

interface TokenCache {
  accessToken: string;
  expiresAtMs: number;
}

interface OAuthTokenResponse {
  access_token?: string;
  expires_in?: number;
}

let tokenCache: TokenCache | null = null;
let inflightTokenRequest: Promise<string> | null = null;

function getCredentials(): { clientId: string; clientSecret: string } {
  if (!QF_CLIENT_ID || !QF_CLIENT_SECRET) {
    throw new Error(MISSING_CREDENTIALS_ERROR);
  }

  return { clientId: QF_CLIENT_ID, clientSecret: QF_CLIENT_SECRET };
}

async function requestAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const tokenUrl = `${QF_AUTH_BASE}/oauth2/token`;
  const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(QF_CONTENT_SCOPE)}`,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `OAuth token request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as OAuthTokenResponse;
  const accessToken = payload.access_token;
  const expiresInSeconds = payload.expires_in ?? 3600;

  if (!accessToken) {
    throw new Error("OAuth token response missing access_token");
  }

  tokenCache = {
    accessToken,
    expiresAtMs: Date.now() + expiresInSeconds * 1000,
  };

  return accessToken;
}

async function getAccessToken(forceRenew = false): Promise<string> {
  const now = Date.now();

  if (
    !forceRenew &&
    tokenCache &&
    now < tokenCache.expiresAtMs - TOKEN_EXPIRY_BUFFER_MS
  ) {
    return tokenCache.accessToken;
  }

  if (!forceRenew && inflightTokenRequest) {
    return inflightTokenRequest;
  }

  inflightTokenRequest = requestAccessToken().finally(() => {
    inflightTokenRequest = null;
  });

  return inflightTokenRequest;
}

export async function qfApiRequest(
  path: string,
  init?: RequestInit,
  hasRetried = false,
): Promise<Response> {
  const { clientId } = getCredentials();
  const accessToken = await getAccessToken();
  const url = `${QF_API_BASE}/content/api/v4${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("x-auth-token", accessToken);
  headers.set("x-client-id", clientId);

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && !hasRetried) {
    await getAccessToken(true);
    return qfApiRequest(path, init, true);
  }

  if (response.status === 403) {
    throw new Error(FORBIDDEN_SCOPE_ERROR);
  }

  return response;
}

export { FORBIDDEN_SCOPE_ERROR, MISSING_CREDENTIALS_ERROR };
