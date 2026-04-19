## Summary of your project

Murajaah is a practice-first web app that uses the SM-2 spaced repetition algorithm to help Muslims build a consistent daily Quran memorization and revision habit — inspired by how Anki and Duolingo make learning stick.

---

## What problem does your project solve?

Millions reconnect with the Quran during Ramadan — but most lose that momentum within weeks. The problem isn't motivation, it's the absence of a system. Without a structured review schedule, memorized verses fade and the habit breaks.

Murajaah.today directly solves this: the SM-2 spaced repetition algorithm automatically schedules each ayah's next review date based on how well you know it — spacing out strong verses and surfacing weak ones sooner. You open the app, the due queue is ready, and you review only what needs reviewing. No planning, no friction. The habit sustains itself long after Ramadan ends.

---

## How does your project help people engage with the Quran?

Murajaah turns murajaah (مراجعة — daily Quran revision) into a lightweight daily habit. Each session shows only the ayahs due for review, rated 1–4 (Again / Hard / Good / Easy). The algorithm adjusts the next review date based on your rating — ayahs you know well space further apart, ones you struggle with return sooner. Progress is saved locally so a slow connection never interrupts a session, and syncs to the server once you're back online — meaning the schedule follows you across phone and desktop.

A daily streak counter (current and longest streak) reinforces the habit loop — the same mechanism that makes Duolingo's retention so effective.

The UX is designed for daily use on any device: fully responsive for mobile, Arabic text rendered right-to-left using the KFGQPC Uthmani Hafs font, in-session audio playback for each ayah, dark and light theme support, and bilingual interface (English and Indonesian). Guest mode requires no account — anyone can start reviewing immediately without signing up.

Unlike generic flashcard apps, Murajaah is purpose-built for Quran revision. Three things make it distinct:

1. **Waqf-aware progressive reveal** — ayahs are split at their Waqf (pause) markers (ۚۘۗۖۙ) and revealed chunk-by-chunk during practice, matching how reciters naturally break verses. No other SRS app does this.
2. **Live Quran.com bookmark sync** — bookmarks saved in the app appear instantly on Quran.com and vice versa, via the QF User API.
3. **Authentic content pipeline** — Uthmani text and recitation audio come directly from the Quran Foundation Content API, not scraped or cached statically.

---

## Who is the primary audience for your application?

Anyone who wants to strengthen their relationship with the Quran through consistent revision:

- **Hifz students** — maintaining large memorized portions of the Quran
- **Former hifz** — people who memorized in the past and want to recover faded verses
- **Everyday Muslims** — learning a few surahs at a time without a formal hifz goal
- **Beginners** — starting with short surahs using pre-built memorization packages
- **Busy professionals** — need a short daily habit, not long study sessions

Guest mode (no account required) lowers the barrier for new learners. The package and track system supports advanced users with large memorization goals.

---

## Technical Implementation

### What technologies did you use?

- **Framework:** Next.js 14 (App Router, React Server Components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State management:** Zustand
- **Local storage:** Dexie (IndexedDB wrapper)
- **Backend database:** Supabase (PostgreSQL + Row Level Security)
- **Authentication:** Quran Foundation OAuth 2.0 (login with Quran.com account)
- **SRS algorithm:** SM-2 (SuperMemo 2), implemented in `src/lib/srs.ts`
- **Offline sync:** Custom IndexedDB sync queue with retry logic (`src/lib/offline/`)
- **Deployment:** Netlify
- **Localization:** English + Indonesian (`src/config/translations.json`)
- **Security:** Server-side API proxy (QF credentials never reach the client), Supabase Row Level Security, rate limiting on bookmark endpoints

---

### Which Quran Foundation Content APIs did you use?

1. **`GET /content/api/v4/chapters`** — fetches the full surah list (names, verse counts, metadata) for the library and track selection screens
2. **`GET /content/api/v4/verses/by_key/{verseKey}`** — fetches individual ayah data (Uthmani text and audio URL) rendered during every practice session

Both endpoints are proxied through internal Next.js API routes (`/api/quran/chapters` and `/api/quran/verses/by_key/[verseKey]`) so QF credentials never reach the client. Responses are CDN-cached to minimize API load on repeat sessions.

---

### Which Quran Foundation User APIs did you use?

1. **OAuth 2.0 Authorization Code flow** — "Login with Quran.com" triggers the QF OAuth flow; the app exchanges the authorization code for access and refresh tokens, then links the `qf_user_id` to an internal app user record in Supabase
2. **User identity resolution** — the `qf_user_id` from the OAuth token scopes all progress data (SRS schedule, track enrollments) to the correct user, enabling cross-device sync
3. **`GET /bookmarks`** — fetches the user's saved ayah bookmarks from Quran.com, displayed in the app's bookmark section
4. **`POST /bookmarks`** — saves a new ayah bookmark to the user's Quran.com account directly from within a practice session
5. **`DELETE /bookmarks/{id}`** — removes a bookmark from the user's Quran.com account
6. **`POST /bookmarks/check`** — bulk-checks which ayahs in a set are already bookmarked, used to sync bookmark state on the UI

All bookmark endpoints are proxied through `/api/user/bookmarks` with rate limiting applied server-side.

---

### Explain how your project uses Quran Foundation APIs

**Content API** powers every practice session. When a user starts reviewing, the app fetches full ayah data from `GET /verses/by_key/{verseKey}` — specifically `fields=text_uthmani` and `audio={recitationId}`. This returns the Uthmani Arabic text (rendered with the KFGQPC Uthmani font) and the recitation audio URL for playback. Requests are proxied server-side to protect credentials and aggressively cached at the CDN layer so repeat sessions load instantly without re-fetching.

**User API** handles both authentication and bookmarks. Users log in with their existing Quran.com account via the QF OAuth 2.0 flow — no separate password needed. The Quran.com identity is linked to an internal `app_user` record in Supabase, scoping all progress data across devices. Beyond auth, the User API powers the **bookmarks** feature: users can save, remove, and view their Quran.com bookmarks directly from within a practice session. Bookmark reads and writes are proxied server-side with rate limiting, and the bookmark state is checked in bulk on page load to keep the UI in sync with the user's Quran.com account.

Together, the APIs deliver authentic Quran content with a personalized, cross-device memorization schedule — and keep the app's bookmark state in live sync with the user's Quran.com account — without requiring the user to manage a separate account.
