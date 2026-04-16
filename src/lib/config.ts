function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const SESSION_COOKIE_MAX_AGE = parsePositiveInt(
  process.env.QF_SESSION_COOKIE_MAX_AGE,
  60 * 60 * 24 * 30,
);

export const OAUTH_STATE_COOKIE_TTL = parsePositiveInt(
  process.env.QF_OAUTH_STATE_TTL,
  60 * 10,
);

export const TOKEN_EXPIRY_BUFFER_MS = parsePositiveInt(
  process.env.QF_TOKEN_EXPIRY_BUFFER_MS,
  30_000,
);

export const TOKEN_EXPIRY_SOON_MS = parsePositiveInt(
  process.env.QF_TOKEN_EXPIRY_SOON_MS,
  5 * 60 * 1000,
);

export const BOOKMARK_RATE_LIMIT_WINDOW_MS = parsePositiveInt(
  process.env.BOOKMARK_RATE_LIMIT_WINDOW_MS,
  60 * 1000,
);

export const BOOKMARK_RATE_LIMIT_MAX = parsePositiveInt(
  process.env.BOOKMARK_RATE_LIMIT_MAX,
  30,
);

const QF_ENV_RESOLVED =
  process.env.QF_ENV === "production" ? "production" : "prelive";

const API_BASE_DEFAULTS = {
  prelive: "https://apis-prelive.quran.foundation",
  production: "https://apis.quran.foundation",
} as const;

const AUTH_BASE_DEFAULTS = {
  prelive: "https://prelive-oauth2.quran.foundation",
  production: "https://oauth2.quran.foundation",
} as const;

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export const QF_API_BASE = process.env.QF_API_BASE_URL?.trim()
  ? normalizeBase(process.env.QF_API_BASE_URL).replace(
      /\/content\/api\/v4$/,
      "",
    )
  : API_BASE_DEFAULTS[QF_ENV_RESOLVED];

export const QF_AUTH_BASE = process.env.QF_AUTH_BASE_URL?.trim()
  ? normalizeBase(process.env.QF_AUTH_BASE_URL).replace(/\/oauth2$/, "")
  : AUTH_BASE_DEFAULTS[QF_ENV_RESOLVED];

export const QF_USER_API_BASE = process.env.QF_USER_API_BASE_URL?.trim()
  ? normalizeBase(process.env.QF_USER_API_BASE_URL)
  : QF_API_BASE;

export const QF_USER_AUTH_BASE = process.env.QF_USER_AUTH_BASE_URL?.trim()
  ? normalizeBase(process.env.QF_USER_AUTH_BASE_URL).replace(/\/oauth2$/, "")
  : QF_AUTH_BASE;

export const QF_CONTENT_SCOPE =
  process.env.QF_CONTENT_SCOPE?.trim() || "content";

export const QF_USER_API_BASE_PATH =
  process.env.QF_USER_API_BASE_PATH?.trim() || "/user/api/v1";

export const QF_USER_AUTH_API_BASE_PATH =
  process.env.QF_USER_AUTH_API_BASE_PATH?.trim() || "/auth";

export const QF_USER_OAUTH_SCOPE =
  process.env.QF_USER_OAUTH_SCOPE?.trim() ||
  "openid offline_access user bookmark";

export const QF_USER_PROFILE_PATH =
  process.env.QF_USER_PROFILE_PATH?.trim() || "/profile";

export const QF_USER_BOOKMARKS_PATH =
  process.env.QF_USER_BOOKMARKS_PATH?.trim() || "/bookmarks";

export const QF_CLIENT_ID = process.env.QF_CLIENT_ID;
export const QF_CLIENT_SECRET = process.env.QF_CLIENT_SECRET;

export const QF_USER_SCOPE = process.env.QF_USER_SCOPE?.trim() || "user";
