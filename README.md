# Murajaah Web App

Offline-first Quran memorization app using SM-2 spaced repetition.

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Supabase (PostgreSQL + Auth)
- Dexie.js (IndexedDB) for offline storage + sync queue
- Zustand for state management
- Tailwind CSS for styling
- Quran.com API v4 for Uthmani text and audio

## Features Implemented (MVP)

- SM-2 rating flow (`Again`, `Hard`, `Good`, `Easy`)
- Hidden/reveal ayah card with progressive reveal by Waqf marks
- Offline-first review writes to Dexie with background sync to Supabase
- Supabase authentication (sign up / sign in / sign out)
- Quran.com ayah fetch (Uthmani text + audio)
- Due review queue based on `nextReviewDate`

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

## Project Structure

- `src/app` — App Router pages (`/`, `/login`)
- `src/components/quran` — Quran UI components
- `src/lib/srs.ts` — SM-2 logic
- `src/lib/quranUtils.ts` — Waqf chunking utility
- `src/lib/quranApi.ts` — Quran.com API client
- `src/lib/offline` — Dexie DB + background sync
- `src/lib/supabase` — Supabase client/auth helpers
- `src/store` — Zustand stores

## Notes

- Quran.com public read endpoints used here do not require an API key.
- Offline reviews are saved locally first and synced when online.

## Security Checklist

- Keep `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in frontend only; never expose service role keys.
- Apply all migrations in `supabase/migrations` before running the app.
- Ensure RLS is enabled and forced for `ayah_progress`.
- Use Supabase Auth protections: email confirmation, strong password requirements, optional MFA.
- Monitor Supabase logs and rotate keys if abuse is detected.
