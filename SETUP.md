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
QF_CLIENT_ID=your-qf-client-id
QF_CLIENT_SECRET=your-qf-client-secret
```

Recommended optional values:

```env
QF_ENV=prelive
NEXT_PUBLIC_DEFAULT_RECITATION_ID=7
NEXT_PUBLIC_AUDIO_CDN_BASE=https://audio.qurancdn.com

# Optional when implementing Quran Foundation User API features
QF_USER_SCOPE=user
# QF_USER_CLIENT_ID=your-user-scope-client-id
# QF_USER_CLIENT_SECRET=your-user-scope-client-secret
# QF_USER_API_BASE_PATH=/user/api/v1
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
5. Login screen works with Supabase auth when `?auth=1` is present.
6. Stats section shows current and longest streak values after reviews.

## Troubleshooting

- `Supabase not configured`: check `NEXT_PUBLIC_SUPABASE_URL` and publishable/anon key.
- Quran proxy errors (`/api/quran/*`): verify `QF_CLIENT_ID` and `QF_CLIENT_SECRET`.
- Missing data/policy errors: re-check migration order and applied status.
