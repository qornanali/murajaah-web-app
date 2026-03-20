# Murajaah — Offline-First Quran Memorization

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Then populate `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_QURAN_API_BASE=https://api.quran.com/api/v4
```

## Database Migrations

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Apply all SQL files in `supabase/migrations` using your preferred workflow (Supabase CLI, SQL Editor, or CI/CD pipeline).
3. Run migrations in filename order and apply pending migrations whenever the project updates.
4. Verify `ayah_progress` exists, and its RLS/policies are active.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

## Architecture

- **Frontend**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS + Sacred Minimalism design
- **Offline**: Dexie.js for local IndexedDB with sync queue
- **State**: Zustand for global review store
- **Backend**: Supabase (PostgreSQL + Auth)
- **SRS**: SM-2 algorithm with configurable ease factor

## Key Files

- `src/lib/srs.ts` — SM-2 algorithm implementation
- `src/lib/quranUtils.ts` — Waqf-based ayah chunking
- `src/lib/offline/db.ts` — Dexie IndexedDB schema
- `src/lib/offline/sync.ts` — Offline-first sync queue processor
- `src/store/reviewStore.ts` — Zustand review workflow
- `src/components/quran/AyahCard.tsx` — Reveal/rating UI
