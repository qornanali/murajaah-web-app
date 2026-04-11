import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

const MISSING_USER_CREDENTIALS_ERROR =
  "Missing Quran Foundation User API credentials. Request access: https://api-docs.quran.foundation/request-access";

const FORBIDDEN_USER_SCOPE_ERROR =
  "Quran Foundation User API request forbidden (403). Ensure user scope and permissions are enabled.";

const MISSING_LINKED_USER_ERROR =
  "Quran.com account is not linked. Please connect your Quran.com account first.";

const LINKED_IDENTITY_NOT_FOUND_ERROR =
  "Linked Quran.com identity not found. Please reconnect your Quran.com account.";

const MISSING_REFRESH_TOKEN_ERROR =
  "Quran.com refresh token is missing. Please reconnect your Quran.com account.";

type QfEnv = "prelive" | "production";

interface TokenCache {
  accessToken: string;
  expiresAtMs: number;
}

interface OAuthTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
}

interface LinkedIdentityRecord {
  qf_user_id: string;
  access_token: string;
  refresh_token: string | null;
  access_token_expires_at: string;
}

const API_BASE_BY_ENV: Record<QfEnv, string> = {
  prelive: "https://apis-prelive.quran.foundation",
  production: "https://apis.quran.foundation",
};

const AUTH_BASE_BY_ENV: Record<QfEnv, string> = {
  prelive: "https://prelive-oauth2.quran.foundation",
  production: "https://oauth2.quran.foundation",
};

let tokenCache: TokenCache | null = null;
let inflightTokenRequest: Promise<string> | null = null;

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function normalizeApiPrefix(prefix: string | undefined): string {
  const normalized = (prefix ?? "/user/api/v1").trim();
  if (!normalized) {
    return "/user/api/v1";
  }

  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;

  return withLeadingSlash.replace(/\/+$/, "");
}

function getEnvironment(): QfEnv {
  const env = process.env.QF_ENV;
  if (env === "production") {
    return "production";
  }
  return "prelive";
}

function getUserScope(): string {
  return process.env.QF_USER_SCOPE?.trim() || "user";
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.QF_USER_CLIENT_ID ?? process.env.QF_CLIENT_ID;
  const clientSecret =
    process.env.QF_USER_CLIENT_SECRET ?? process.env.QF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(MISSING_USER_CREDENTIALS_ERROR);
  }

  return { clientId, clientSecret };
}

function parseExpiryMillis(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getApiBaseUrl(): string {
  const configured = process.env.QF_USER_API_BASE_URL;
  if (configured && configured.trim()) {
    return normalizeBaseUrl(configured);
  }

  const sharedBase = process.env.QF_API_BASE_URL;
  if (sharedBase && sharedBase.trim()) {
    return normalizeBaseUrl(sharedBase).replace(/\/content\/api\/v4$/, "");
  }

  return API_BASE_BY_ENV[getEnvironment()];
}

function getAuthBaseUrl(): string {
  const configured = process.env.QF_USER_AUTH_BASE_URL;
  if (configured && configured.trim()) {
    return normalizeBaseUrl(configured).replace(/\/oauth2$/, "");
  }

  const sharedBase = process.env.QF_AUTH_BASE_URL;
  if (sharedBase && sharedBase.trim()) {
    return normalizeBaseUrl(sharedBase).replace(/\/oauth2$/, "");
  }

  return AUTH_BASE_BY_ENV[getEnvironment()];
}

async function requestAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const tokenUrl = `${getAuthBaseUrl()}/oauth2/token`;
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
    body: `grant_type=client_credentials&scope=${encodeURIComponent(getUserScope())}`,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `User API OAuth token request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as OAuthTokenResponse;
  const accessToken = payload.access_token;
  const expiresInSeconds = payload.expires_in ?? 3600;

  if (!accessToken) {
    throw new Error("User API OAuth token response missing access_token");
  }

  tokenCache = {
    accessToken,
    expiresAtMs: Date.now() + expiresInSeconds * 1000,
  };

  return accessToken;
}

async function getAccessToken(forceRenew = false): Promise<string> {
  const now = Date.now();

  if (!forceRenew && tokenCache && now < tokenCache.expiresAtMs - 30_000) {
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

async function getLinkedIdentityRecord(
  qfUserId: string,
): Promise<LinkedIdentityRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("qf_user_identities")
    .select("qf_user_id, access_token, refresh_token, access_token_expires_at")
    .eq("qf_user_id", qfUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(LINKED_IDENTITY_NOT_FOUND_ERROR);
  }

  return data as LinkedIdentityRecord;
}

async function refreshLinkedUserToken(qfUserId: string): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const identity = await getLinkedIdentityRecord(qfUserId);

  if (!identity.refresh_token) {
    throw new Error(MISSING_REFRESH_TOKEN_ERROR);
  }

  const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", identity.refresh_token);

  const response = await fetch(`${getAuthBaseUrl()}/oauth2/token`, {
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
    throw new Error(
      `User API token refresh failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as OAuthTokenResponse;
  if (!payload.access_token || !payload.expires_in) {
    throw new Error("User API token refresh response is incomplete");
  }

  const expiresAtIso = new Date(
    Date.now() + payload.expires_in * 1000,
  ).toISOString();

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("qf_user_identities")
    .update({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token ?? identity.refresh_token,
      access_token_expires_at: expiresAtIso,
      granted_scopes: payload.scope ?? "",
      token_type: payload.token_type ?? "Bearer",
      last_refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("qf_user_id", qfUserId);

  if (error) {
    throw new Error(error.message);
  }

  return payload.access_token;
}

async function getLinkedUserAccessToken(
  qfUserId: string,
  forceRenew = false,
): Promise<string> {
  const identity = await getLinkedIdentityRecord(qfUserId);
  const expiresAtMs = parseExpiryMillis(identity.access_token_expires_at);

  if (!forceRenew && Date.now() < expiresAtMs - 30_000) {
    return identity.access_token;
  }

  return refreshLinkedUserToken(qfUserId);
}

export async function qfUserApiRequestForLinkedUser(
  qfUserId: string | null,
  path: string,
  init?: RequestInit,
  hasRetried = false,
): Promise<Response> {
  if (!qfUserId) {
    throw new Error(MISSING_LINKED_USER_ERROR);
  }

  const { clientId } = getCredentials();
  const accessToken = await getLinkedUserAccessToken(qfUserId);
  const apiPrefix = normalizeApiPrefix(process.env.QF_USER_API_BASE_PATH);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${apiPrefix}${normalizedPath}`;

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
    await getLinkedUserAccessToken(qfUserId, true);
    return qfUserApiRequestForLinkedUser(qfUserId, path, init, true);
  }

  if (response.status === 403) {
    throw new Error(FORBIDDEN_USER_SCOPE_ERROR);
  }

  return response;
}

export async function qfUserApiRequest(
  path: string,
  init?: RequestInit,
  hasRetried = false,
): Promise<Response> {
  const { clientId } = getCredentials();
  const accessToken = await getAccessToken();
  const apiPrefix = normalizeApiPrefix(process.env.QF_USER_API_BASE_PATH);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${apiPrefix}${normalizedPath}`;

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
    return qfUserApiRequest(path, init, true);
  }

  if (response.status === 403) {
    throw new Error(FORBIDDEN_USER_SCOPE_ERROR);
  }

  return response;
}

export {
  FORBIDDEN_USER_SCOPE_ERROR,
  LINKED_IDENTITY_NOT_FOUND_ERROR,
  MISSING_LINKED_USER_ERROR,
  MISSING_REFRESH_TOKEN_ERROR,
  MISSING_USER_CREDENTIALS_ERROR,
};
