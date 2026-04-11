# Murajaah Web App

Murajaah is an offline-first Quran memorization web app that combines guided recall practice with SM-2 spaced repetition.

## Product Snapshot

- Practice flow with ratings: `Again`, `Hard`, `Good`, `Easy`
- Progressive ayah reveal using Waqf chunking
- Due-review queue powered by SM-2 scheduling
- Current/longest streak metrics from review activity
- Surah tracks and package-based tracks
- Guest mode (local-only) and Quran.com OAuth-linked mode
- Bookmark sync with Quran.com account (add, remove, status indicator)
- Offline queue via IndexedDB (Dexie) with background sync when online
- EN/ID localization and light/dark theme support

## Stack

- Next.js 14 (App Router, TypeScript)
- React 18
- Supabase (PostgreSQL)
- Dexie (offline store + sync queue)
- Zustand (state management)
- Tailwind CSS
- Quran Foundation content APIs (proxied via Next.js API routes)

## Prerequisites

- Node.js 18+ (Node.js 20 LTS recommended)
- npm 9+
- Supabase project
- Quran Foundation API client credentials (for `/api/quran/*` server routes)

## Quick Start

```bash
git clone <your-repo-url>
cd murajaah-web-app
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

For a short onboarding checklist, see `SETUP.md`.

## Environment Variables

Required variables:

| Variable                               | Description                                                          |
| -------------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_API_KEY`              | Supabase secret API key (server-side only, used to bypass RLS)       |
| `QF_CLIENT_ID`                         | Quran Foundation OAuth2 client ID                                    |
| `QF_CLIENT_SECRET`                     | Quran Foundation OAuth2 client secret                                |

Optional variables (all server-side unless prefixed `NEXT_PUBLIC_`):

| Variable                              | Default                               | Description                                         |
| ------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `QF_ENV`                              | `prelive`                             | Target QF environment: `prelive` or `production`    |
| `QF_USER_OAUTH_REDIRECT_URI`          | `${origin}/api/user/oauth/callback`   | OAuth callback URL — must match registered redirect |
| `QF_USER_OAUTH_SCOPE`                 | `openid offline_access user bookmark` | Scopes requested during OAuth                       |
| `QF_USER_SCOPE`                       | `user`                                | Scope for client-credentials token used by User API |
| `QF_USER_API_BASE_PATH`               | `/user/api/v1`                        | Base path prefix for User API calls                 |
| `QF_USER_BOOKMARKS_PATH`              | `/bookmarks`                          | Bookmarks endpoint path                             |
| `QF_USER_PROFILE_PATH`                | `/profile`                            | User profile endpoint path                          |
| `QF_API_BASE_URL`                     | _(derived from `QF_ENV`)_             | Override the content API base URL                   |
| `QF_AUTH_BASE_URL`                    | _(derived from `QF_ENV`)_             | Override the OAuth2 base URL                        |
| `QF_USER_API_BASE_URL`                | _(same as `QF_API_BASE_URL`)_         | Override the User API base URL                      |
| `QF_USER_AUTH_BASE_URL`               | _(same as `QF_AUTH_BASE_URL`)_        | Override the User OAuth2 base URL                   |
| `QF_CONTENT_SCOPE`                    | `content`                             | Scope for content API client-credentials token      |
| `QF_CACHE_MAX_AGE`                    | `3600`                                | Shared cache max-age for Quran proxy routes         |
| `QF_CACHE_S_MAXAGE_CHAPTERS`          | `86400`                               | CDN s-maxage for chapters                           |
| `QF_CACHE_SWR_CHAPTERS`               | `604800`                              | CDN stale-while-revalidate for chapters             |
| `QF_CACHE_S_MAXAGE_VERSES`            | `2592000`                             | CDN s-maxage for verses                             |
| `QF_CACHE_SWR_VERSES`                 | `31536000`                            | CDN stale-while-revalidate for verses               |
| `QF_SESSION_COOKIE_MAX_AGE`           | `2592000`                             | OAuth session cookie lifetime (seconds)             |
| `QF_OAUTH_STATE_TTL`                  | `600`                                 | PKCE state cookie TTL (seconds)                     |
| `QF_TOKEN_EXPIRY_BUFFER_MS`           | `30000`                               | Renew token this many ms before expiry              |
| `QF_TOKEN_EXPIRY_SOON_MS`             | `300000`                              | Define "expiring soon" threshold (ms)               |
| `BOOKMARK_RATE_LIMIT_WINDOW_MS`       | `60000`                               | Bookmark rate limit window (ms)                     |
| `BOOKMARK_RATE_LIMIT_MAX`             | `30`                                  | Max bookmark requests per window                    |
| `NEXT_PUBLIC_DEFAULT_RECITATION_ID`   | `7`                                   | Default recitation for audio playback               |
| `NEXT_PUBLIC_AUDIO_CDN_BASE`          | `https://audio.qurancdn.com`          | Audio CDN base URL                                  |
| `NEXT_PUBLIC_REVEAL_MIN_SECONDS`      | `6`                                   | Min auto-reveal delay                               |
| `NEXT_PUBLIC_REVEAL_MAX_SECONDS`      | `20`                                  | Max auto-reveal delay                               |
| `NEXT_PUBLIC_REVEAL_CHARS_PER_SECOND` | `12`                                  | Auto-reveal speed (chars/sec)                       |

Notes:

- `NEXT_PUBLIC_*` variables are exposed to the browser; all others are server-only.
- `QF_CLIENT_ID`/`QF_CLIENT_SECRET` are used for both the content API and the User API — no separate user credentials needed.
- `SUPABASE_SECRET_API_KEY` must be a Supabase Secret API key (revocable). Never use the service role key in production.
- OAuth login routes: `/api/user/oauth/start`, `/api/user/oauth/callback`, `/api/user/oauth/status`, `/api/user/oauth/logout`.

## Database Setup

Apply all SQL files in `supabase/migrations` in filename order.

- Recommended workflow: Supabase CLI, SQL Editor, or CI/CD migrations.
- Re-apply new pending migrations whenever pulling updates.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Architecture Notes

- Client ayah fetches go through internal proxy routes:
  - `GET /api/quran/chapters`
  - `GET /api/quran/verses/by_key/[verseKey]`
- Bookmark endpoints (authenticated users only, rate-limited at 30 req/min):
  - `GET /api/user/bookmarks`
  - `POST /api/user/bookmarks`
  - `DELETE /api/user/bookmarks`
  - `POST /api/user/bookmarks/check`
- OAuth user linking:
  - `GET /api/user/oauth/start`
  - `GET /api/user/oauth/callback`
  - `GET /api/user/oauth/status`
  - `POST /api/user/oauth/logout`
  - `GET /api/user/session`
- All configurable runtime values (base URLs, token TTLs, rate limits) are resolved once in `src/lib/config.ts`.
- Internal routes call Quran Foundation APIs using OAuth2 client-credentials or per-user token refresh, all in server-only code.
- Review writes are stored in Dexie first, then synced to Supabase using a retrying queue.
- Guest progress is intentionally local-only; migrates to Supabase on first OAuth login.

## Project Layout

- `src/app` App Router pages and API routes
- `src/components` feature UI components
- `src/lib/config.ts` central runtime config (all env var reads)
- `src/lib/srs.ts` SM-2 implementation
- `src/lib/quranApi.ts` client Quran request helpers
- `src/lib/qf/contentApi.ts` server-side Quran Foundation content API client
- `src/lib/qf/userApi.ts` server-side Quran Foundation User API client
- `src/lib/qf/oauth.ts` OAuth2/PKCE flow helpers
- `src/lib/offline` Dexie schema and sync logic
- `src/lib/packages` package catalog and enrollment logic
- `src/lib/supabase` Supabase client/admin helpers
- `src/lib/rateLimit.ts` in-memory rate limiter
- `src/store` Zustand stores
- `supabase/migrations` schema and policy migrations

## PRD Summary and AI Context

AI-focused project context lives in `docs/ai`:

- `docs/ai/PRD_SUMMARY.md`
- `docs/ai/CODING_BEST_PRACTICES.md`
- `docs/ai/AGENT_WORKFLOW.md`

## Security Notes

- Keep secrets out of client code and logs.
- Validate and sanitize all external inputs.
- Keep Supabase RLS and policies aligned with migration files.
- Use principle of least privilege for all API/database credentials.
