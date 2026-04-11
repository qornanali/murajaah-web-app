# Murajaah Setup

This guide is the fastest way to run the app locally.

## 1) Install

```bash
git clone <your-repo-url>
cd murajaah-web-app
npm install
```

## 2) Configure Environment

```bash
cp .env.example .env.local
```

Minimum required values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
QF_CLIENT_ID=your-qf-client-id
QF_CLIENT_SECRET=your-qf-client-secret
```

Recommended optional values:

```env
QF_ENV=prelive
NEXT_PUBLIC_DEFAULT_RECITATION_ID=7
NEXT_PUBLIC_AUDIO_CDN_BASE=https://audio.qurancdn.com

# Quran Foundation User API (OAuth login + bookmarks)
QF_USER_CLIENT_ID=your-user-scope-client-id
QF_USER_CLIENT_SECRET=your-user-scope-client-secret
QF_USER_OAUTH_REDIRECT_URI=http://localhost:3000/api/user/oauth/callback
QF_USER_OAUTH_SCOPE=openid offline_access user bookmark
QF_USER_SCOPE=user
QF_USER_API_BASE_PATH=/user/api/v1
QF_USER_BOOKMARKS_PATH=/bookmarks
QF_USER_PROFILE_PATH=/profile

# QF API base URL overrides (defaults match QF_ENV)
# QF_API_BASE_PRELIVE=https://apis-prelive.quran.foundation
# QF_API_BASE_PRODUCTION=https://apis.quran.foundation
# QF_AUTH_BASE_PRELIVE=https://prelive-oauth2.quran.foundation
# QF_AUTH_BASE_PRODUCTION=https://oauth2.quran.foundation
# QF_API_BASE_URL=https://custom-api-host.example.com/content/api/v4
# QF_AUTH_BASE_URL=https://custom-auth-host.example.com/oauth2
# QF_USER_API_BASE_URL=https://custom-user-api-host.example.com
# QF_USER_AUTH_BASE_URL=https://custom-user-auth-host.example.com/oauth2

# QF scope overrides
# QF_CONTENT_SCOPE=content

# Session and token tuning
# QF_SESSION_COOKIE_MAX_AGE=2592000    # seconds, default 30 days
# QF_OAUTH_STATE_TTL=600               # seconds, default 10 min
# QF_TOKEN_EXPIRY_BUFFER_MS=30000      # ms, default 30s
# QF_TOKEN_EXPIRY_SOON_MS=300000       # ms, default 5 min

# Bookmark rate limiting
# BOOKMARK_RATE_LIMIT_WINDOW_MS=60000  # ms, default 60s
# BOOKMARK_RATE_LIMIT_MAX=30           # requests per window, default 30
```

## 3) Apply Supabase Migrations

Apply all files in `supabase/migrations` in filename order.

Checklist:

1. Create a Supabase project.
2. Run every migration file.
3. Confirm tables/policies are present (`ayah_progress`, `memorization_packages`, `user_surah_tracks`, related RLS updates).

## 4) Run App

```bash
npm run dev
```

Open http://localhost:3000.

## 5) Verify Core Flows

1. Home page loads and source sheet opens.
2. Quran ayah fetch works in practice mode.
3. Ratings (`Again`, `Hard`, `Good`, `Easy`) update queue.
4. Offline write queue is created while online/offline toggles.
5. OAuth link flow works via `/login?auth=1` -> Continue with Quran.com -> callback sets linked status.
6. Stats section shows current and longest streak values after reviews.

## Troubleshooting

- `Supabase not configured`: check `NEXT_PUBLIC_SUPABASE_URL` and publishable/anon key.
- Quran proxy errors (`/api/quran/*`): verify `QF_CLIENT_ID` and `QF_CLIENT_SECRET`.
- OAuth link errors (`/api/user/oauth/*`): verify `SUPABASE_SERVICE_ROLE_KEY`, `QF_USER_OAUTH_REDIRECT_URI`, and registered redirect URI exact match.
- Missing data/policy errors: re-check migration order and applied status.
