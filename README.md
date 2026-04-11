# Murajaah Web App

Murajaah is an offline-first Quran memorization web app that combines guided recall practice with SM-2 spaced repetition.

## Product Snapshot

- Practice flow with ratings: `Again`, `Hard`, `Good`, `Easy`
- Progressive ayah reveal using Waqf chunking
- Due-review queue powered by SM-2 scheduling
- Surah tracks and package-based tracks
- Guest mode (local-only) and authenticated mode (Supabase sync)
- Offline queue via IndexedDB (Dexie) with background sync when online
- EN/ID localization and light/dark theme support

## Stack

- Next.js 14 (App Router, TypeScript)
- React 18
- Supabase (PostgreSQL + Auth)
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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `QF_CLIENT_ID`
- `QF_CLIENT_SECRET`

Optional variables:

- `QF_ENV` (`prelive` or `production`, default is `prelive`)
- `QF_API_BASE_URL`
- `QF_AUTH_BASE_URL`
- `QF_CACHE_MAX_AGE`
- `QF_CACHE_S_MAXAGE_CHAPTERS`
- `QF_CACHE_SWR_CHAPTERS`
- `QF_CACHE_S_MAXAGE_VERSES`
- `QF_CACHE_SWR_VERSES`
- `NEXT_PUBLIC_DEFAULT_RECITATION_ID`
- `NEXT_PUBLIC_AUDIO_CDN_BASE`

Notes:

- `NEXT_PUBLIC_*` variables are exposed to the browser.
- Keep `QF_CLIENT_SECRET` server-side only.
- Never expose Supabase service role keys in frontend/runtime client code.

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

- Client ayah fetches go through internal routes:
  - `GET /api/quran/chapters`
  - `GET /api/quran/verses/by_key/[verseKey]`
- Internal routes call Quran Foundation APIs using OAuth2 token flow in server-only code.
- Review writes are stored in Dexie first, then synced to Supabase using a retrying queue.
- Guest progress is intentionally local-only.

## Project Layout

- `src/app` App Router pages and API routes
- `src/components` feature UI components
- `src/lib/srs.ts` SM-2 implementation
- `src/lib/quranApi.ts` client Quran request helpers
- `src/lib/qf/contentApi.ts` server-side Quran Foundation OAuth/content client
- `src/lib/offline` Dexie schema and sync logic
- `src/lib/packages` package catalog and enrollment logic
- `src/lib/supabase` Supabase client/auth helpers
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
