import Dexie, { type Table } from "dexie";

export interface AyahProgressRow {
  id: string;
  userId: string;
  surahNumber: number;
  ayahNumber: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  localId?: number;
  entity: "ayah_progress";
  entityId: string;
  payload: AyahProgressRow;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

class MurajaahDexieDB extends Dexie {
  ayahProgress!: Table<AyahProgressRow, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("murajaahDB");

    this.version(1).stores({
      ayahProgress:
        "id, [userId+surahNumber+ayahNumber], nextReviewDate, updatedAt",
      syncQueue: "++localId, status, createdAt, entity, entityId",
    });
  }
}

export const murajaahDB = new MurajaahDexieDB();
