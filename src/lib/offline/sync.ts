import { murajaahDB, type AyahProgressRow } from "./db";
import { isGuestUserId } from "@/lib/guest";

let activeSync: Promise<void> | null = null;

function validateAyahProgressRecord(record: AyahProgressRow) {
  if (isGuestUserId(record.userId)) {
    throw new Error("Guest progress is local-only and cannot be synced");
  }

  if (
    !Number.isInteger(record.surahNumber) ||
    record.surahNumber < 1 ||
    record.surahNumber > 114
  ) {
    throw new Error("Invalid surah number in sync payload");
  }

  if (
    !Number.isInteger(record.ayahNumber) ||
    record.ayahNumber < 1 ||
    record.ayahNumber > 300
  ) {
    throw new Error("Invalid ayah number in sync payload");
  }

  if (
    !Number.isFinite(record.easeFactor) ||
    record.easeFactor < 1.3 ||
    record.easeFactor > 3.5
  ) {
    throw new Error("Invalid ease factor in sync payload");
  }

  if (
    !Number.isInteger(record.interval) ||
    record.interval < 0 ||
    record.interval > 36500
  ) {
    throw new Error("Invalid interval in sync payload");
  }

  if (
    !Number.isInteger(record.repetitions) ||
    record.repetitions < 0 ||
    record.repetitions > 10000
  ) {
    throw new Error("Invalid repetitions in sync payload");
  }

  if (Number.isNaN(new Date(record.nextReviewDate).getTime())) {
    throw new Error("Invalid next review date in sync payload");
  }
}

async function pushAyahProgress(record: AyahProgressRow) {
  validateAyahProgressRecord(record);

  const response = await fetch("/api/user/ayah-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.message === "string"
        ? data.message
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
}

export async function hydrateFromServer(userId: string): Promise<void> {
  if (isGuestUserId(userId)) {
    return;
  }

  const response = await fetch("/api/user/ayah-progress");

  if (!response.ok) {
    throw new Error(`Hydration failed: HTTP ${response.status}`);
  }

  const rows: AyahProgressRow[] = await response.json();

  if (rows.length === 0) {
    return;
  }

  await murajaahDB.ayahProgress.bulkPut(rows);
}

export async function enqueueAyahProgressSync(record: AyahProgressRow) {
  if (isGuestUserId(record.userId)) {
    return;
  }

  const now = new Date().toISOString();

  await murajaahDB.syncQueue.add({
    entity: "ayah_progress",
    entityId: record.id,
    payload: record,
    status: "pending",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function processSyncQueue() {
  if (activeSync) {
    return activeSync;
  }

  activeSync = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const pendingItems = await murajaahDB.syncQueue
      .where("status")
      .equals("pending")
      .sortBy("createdAt");

    for (const item of pendingItems) {
      if (!item.localId) {
        continue;
      }

      await murajaahDB.syncQueue.update(item.localId, {
        status: "syncing",
        updatedAt: new Date().toISOString(),
      });

      try {
        await pushAyahProgress(item.payload);
        await murajaahDB.syncQueue.delete(item.localId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown sync error";
        await murajaahDB.syncQueue.update(item.localId, {
          status: "failed",
          retryCount: item.retryCount + 1,
          errorMessage: message,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const failedItems = await murajaahDB.syncQueue
      .where("status")
      .equals("failed")
      .toArray();

    for (const item of failedItems) {
      if (!item.localId) {
        continue;
      }

      if (item.retryCount >= 3) {
        continue;
      }

      await murajaahDB.syncQueue.update(item.localId, {
        status: "pending",
        updatedAt: new Date().toISOString(),
      });
    }
  })();

  try {
    await activeSync;
  } finally {
    activeSync = null;
  }
}

export function startBackgroundSync() {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onOnline = () => {
    void processSyncQueue();
  };

  window.addEventListener("online", onOnline);

  if (navigator.onLine) {
    void processSyncQueue();
  }

  return () => {
    window.removeEventListener("online", onOnline);
  };
}
