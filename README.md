# Murajaah Web App

Offline-first Quran memorization app using SM-2 spaced repetition.

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Supabase (PostgreSQL + Auth)
- Dexie.js (IndexedDB) for offline storage + sync queue
- Zustand for state management
- Tailwind CSS for styling
- Quran.com API v4 for Uthmani text and audio

## Features

- SM-2 rating flow (`Again`, `Hard`, `Good`, `Easy`) with per-button preview info:
  - next review timing
  - effect on repetition count and ease factor
- Ayah practice card:
  - optional hint toggle (ratings are always available)
  - progressive reveal by Waqf marks
  - surah name display (for context, e.g. `112:1` → `Al-Ikhlas`)
- Auto-advance to next ayah after rating (with surah rollover)
- Due review queue based on `nextReviewDate`
- Practice-first home layout (mobile-friendly)
- Source picker bottom sheet with dual flow:
  - direct surah practice
  - learning package practice
- Public learning package catalog (no sign-in required)
- Learning package status with `Start/Resume`, `Pause`, `Complete`:
  - authenticated users synced to Supabase
  - guest users persisted locally
- Surah/package search in source picker
- Package pagination in source picker
- Offline-first review writes to Dexie with background sync to Supabase
- Supabase authentication (sign up / sign in / sign out) + continue as guest
- Quran.com ayah fetch (Uthmani text + audio)
- EN/ID localization
- Light/dark mode (icon toggle on home and auth screens)
- Branded SVG logo + icon
- Header info center modal (source, credit, legal, feedback)
- Methodology section with Anki inspiration reference

## 1) Prerequisites

- Node.js 18+ (recommended: Node 20 LTS)
- npm 9+
- A Supabase project

## 2) Clone and Install

```bash
git clone <your-repo-url>
cd murajaah-web-app
npm install
```

## 3) Configure Environment Variables

Copy the template:

```bash
cp .env.example .env.local
```

Set values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_QURAN_API_BASE=https://api.quran.com/api/v4
```

## 4) Apply Database Migrations (Supabase)

Apply all SQL files in `supabase/migrations` to your Supabase database.

Recommended approach:

- Run migrations in filename order.
- Re-run pending migrations whenever the project updates.
- Use your normal migration workflow (Supabase CLI, SQL Editor, or CI/CD pipeline).

This keeps schema, constraints, and RLS policies aligned with the app code.

## 5) Run Locally

Start development server:

```bash
npm run dev
```

Open:

- http://localhost:3000

Useful commands:

```bash
npm run build
npm start
npm run lint
```

## Memorization Methodology

Murajaah flow in this app:

1. Recall first without looking.
2. Use hint only when needed.
3. Rate honestly (`Again`, `Hard`, `Good`, `Easy`).
4. Let spaced repetition schedule the next review automatically.

Inspired by Anki's spaced-repetition workflow:

- https://apps.ankiweb.net/

## Data Source and Disclaimer

- Main Quran text/audio source: https://quran.com
- Learning package metadata source: Supabase (`memorization_packages`)
- Always verify recitation and text with your mushaf.

## Deployment Recommendation

Recommended host: **Vercel** (best fit for Next.js App Router), paired with Supabase.

Alternative hosts:

- Cloudflare Pages
- Netlify

## Project Structure

- `src/app` — App Router pages (`/`, `/login`)
- `src/components/quran` — Quran UI components
- `src/lib/srs.ts` — SM-2 logic
- `src/lib/quranUtils.ts` — Waqf chunking utility
- `src/lib/quranApi.ts` — Quran.com API client
- `src/lib/quranMeta.ts` — Surah metadata (names)
- `src/lib/offline` — Dexie DB + background sync
- `src/lib/supabase` — Supabase client/auth helpers
- `src/store` — Zustand stores

## Notes

- Quran.com public read endpoints used here do not require an API key.
- Offline reviews are saved locally first and synced when online.
- Guest mode allows local-only progress without requiring login.
- Published packages are readable publicly; guest package status is stored in local storage.

## Security Checklist

- Keep `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in frontend only; never expose service role keys.
- Apply all migrations in `supabase/migrations` before running the app.
- Ensure RLS is enabled and forced for `ayah_progress`.
- Use Supabase Auth protections: email confirmation, strong password requirements, optional MFA.
- Monitor Supabase logs and rotate keys if abuse is detected.
