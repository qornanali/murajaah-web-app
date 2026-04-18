# Ayah Progress Sync Flow

## Overview

Progress is stored locally in **IndexedDB** (via Dexie) as the primary source of truth for reads. Supabase is the remote store that persists data across devices. Sync is **write-optimistic**: local writes happen immediately, then the change is pushed to Supabase asynchronously.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│                                                             │
│  ┌─────────────┐    ┌────────────────┐    ┌─────────────┐  │
│  │ PracticeSession│  │  reviewStore   │    │  IndexedDB  │  │
│  │ (UI Layer)  │──▶│  (Zustand)     │◀──▶│  (Dexie)    │  │
│  └─────────────┘    └────────────────┘    └──────┬──────┘  │
│                             │                    │          │
│                             │                 syncQueue     │
│                             │                    │          │
│                      sync.ts layer                │          │
│                    ┌────────┴────────────────────┘          │
│                    │  enqueueAyahProgressSync()             │
│                    │  processSyncQueue()                    │
│                    │  hydrateFromServer()                   │
│                    └────────────────┬────────────           │
└─────────────────────────────────────┼───────────────────────┘
                                      │ HTTP
                         ┌────────────▼────────────┐
                         │  Next.js API Route       │
                         │  /api/user/ayah-progress │
                         │  GET  │  POST            │
                         └────────────┬────────────┘
                                      │ Supabase Admin SDK
                         ┌────────────▼────────────┐
                         │        Supabase          │
                         │    ayah_progress table   │
                         └─────────────────────────┘
```

---

## Write Path — Rating an Ayah (Local → Server)

When a user rates an ayah during a practice session:

```
User rates ayah (1–4)
  │
  ▼
reviewStore.rateAyah()
  ├─ 1. Read existing row from IndexedDB
  ├─ 2. calculateSM2() → new ease factor, interval, repetitions, nextReviewDate
  ├─ 3. murajaahDB.ayahProgress.put(row)        ← instant local write
  ├─ 4. enqueueAyahProgressSync(row)            ← add to IndexedDB syncQueue
  └─ 5. if (navigator.onLine) processSyncQueue()

processSyncQueue()
  ├─ Guard: skip if already running (mutex via activeSync)
  ├─ Guard: skip if offline
  ├─ For each "pending" item (sorted by createdAt):
  │    ├─ Mark as "syncing"
  │    ├─ POST /api/user/ayah-progress  →  Supabase upsert
  │    ├─ Success: delete item from syncQueue
  │    └─ Failure: mark "failed", increment retryCount, save errorMessage
  └─ For each "failed" item:
       └─ if retryCount < 3: reset to "pending" for next cycle
          if retryCount >= 3: leave as permanently "failed"
```

Background sync also triggers `processSyncQueue()` on:
- App load (if online)
- `window` `online` event (device reconnects to network)

### Conflict Resolution

Before writing to Supabase, the POST handler fetches the existing row's `updated_at`. If the server record is already **newer or equal**, the upsert is skipped. This prevents stale sync queue entries from overwriting more recent progress.

```
POST /api/user/ayah-progress
  ├─ Fetch existing row.updated_at from Supabase
  ├─ if existing.updated_at >= payload.updatedAt → return { success: true } (no write)
  └─ else → upsert row (onConflict: user_id, surah_number, ayah_number)
```

---

## Read Path — Loading the Due Queue (Server → Local → UI)

On page load, after the authenticated `userId` is resolved:

```
reviewStore.loadDueQueue(userId)
  │
  ├─ 1. Count IndexedDB rows for this userId
  │
  ├─ if count === 0 (new device / cleared storage):
  │    └─ hydrateFromServer(userId)
  │         ├─ GET /api/user/ayah-progress  →  all Supabase rows for user
  │         └─ murajaahDB.ayahProgress.bulkPut(rows)  ← populate IndexedDB
  │
  └─ 2. Query IndexedDB for rows where nextReviewDate ≤ now AND userId matches
       └─ Sort ascending by nextReviewDate
       └─ Set dueQueue in Zustand store
```

> **Guest users** skip both hydration and sync — their progress is local-only.

---

## Reset Track Flow

When a user resets a track, only **exclusive ayahs** are deleted — ayahs shared with other active tracks are protected.

```
doResetTrack(track)
  ├─ 1. Compute trackKeys = all verse keys in this track
  ├─ 2. Compute otherKeys = union of verse keys in all other active tracks
  ├─ 3. exclusiveKeys = trackKeys − otherKeys   ← shared ayahs are safe
  ├─ 4. resetProgressForVerseKeys(userId, exclusiveKeys)
  │       ├─ Delete from IndexedDB (murajaahDB.ayahProgress)
  │       ├─ Delete from Supabase  (direct DELETE, not queued)
  │       └─ Remove any pending syncQueue entries for these IDs
  └─ 5. Update track enrollment status (paused / removed)
```

> **Note:** The Supabase delete in step 4 is attempted directly (not enqueued). If the device is offline at the time of reset, the Supabase delete will fail silently. The rows will be removed from Supabase on the next full hydration pull from another device. Offline-safe delete queuing is a planned improvement.

---

## Schema

### IndexedDB — `ayah_progress` table

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `userId` | string | App user ID |
| `surahNumber` | number | 1–114 |
| `ayahNumber` | number | 1–300 |
| `easeFactor` | number | SM-2 ease factor (1.3–3.5) |
| `interval` | number | Days until next review |
| `repetitions` | number | Times reviewed successfully |
| `nextReviewDate` | ISO string | When this ayah is next due |
| `updatedAt` | ISO string | Last local modification time |

**Indexes:** `id` (PK), `[userId+surahNumber+ayahNumber]` (compound, unique), `nextReviewDate`, `updatedAt`

> One row per `(userId, surahNumber, ayahNumber)`. An ayah that belongs to multiple tracks shares a single progress row.

### IndexedDB — `syncQueue` table

| Field | Type | Description |
|---|---|---|
| `localId` | number (auto) | Primary key |
| `entity` | string | Always `"ayah_progress"` |
| `entityId` | string | The `ayah_progress.id` being synced |
| `payload` | AyahProgressRow | Full record to push |
| `status` | enum | `pending` / `syncing` / `failed` |
| `retryCount` | number | Incremented on each failed attempt |
| `errorMessage` | string? | Last error from the server |
| `createdAt` | ISO string | When enqueued |
| `updatedAt` | ISO string | Last status change |

Items with `retryCount >= 3` are permanently marked `failed` and not retried.

---

## Cross-Device Sync Summary

| Scenario | Behaviour |
|---|---|
| First open on new device | `hydrateFromServer` pulls all Supabase rows into IndexedDB |
| Rate ayah while online | Written to IndexedDB + pushed to Supabase immediately |
| Rate ayah while offline | Written to IndexedDB; queued; pushed when back online |
| Open app after going back online | `startBackgroundSync` → `processSyncQueue` flushes queue |
| Stale sync queue entry arrives | Server skips write if its `updated_at` is already newer |
| Persistent sync failure (3+ retries) | Item left as `failed`; not retried again |
| Reset track with shared ayahs | Only exclusive ayahs deleted; shared ones untouched |
