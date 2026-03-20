import { create } from "zustand";

import { murajaahDB, type AyahProgressRow } from "@/lib/offline/db";
import { toUserError } from "@/lib/errorHandling";
import { isGuestUserId, isSupportedUserId } from "@/lib/guest";
import { enqueueAyahProgressSync, processSyncQueue } from "@/lib/offline/sync";
import { calculateSM2, type SM2Rating } from "@/lib/srs";

interface RateAyahInput {
  userId: string;
  surahNumber: number;
  ayahNumber: number;
  rating: SM2Rating;
}

interface ReviewState {
  latestProgress: AyahProgressRow | null;
  dueQueue: AyahProgressRow[];
  isQueueLoading: boolean;
  isSaving: boolean;
  error: string | null;
  rateAyah: (input: RateAyahInput) => Promise<AyahProgressRow>;
  loadDueQueue: (userId: string) => Promise<AyahProgressRow[]>;
  loadAyahProgress: (
    userId: string,
    surahNumber: number,
    ayahNumber: number,
  ) => Promise<AyahProgressRow | null>;
}

function validateRateInput(input: RateAyahInput) {
  if (!isSupportedUserId(input.userId)) {
    throw new Error("Invalid user identifier format");
  }

  if (
    !Number.isInteger(input.surahNumber) ||
    input.surahNumber < 1 ||
    input.surahNumber > 114
  ) {
    throw new Error("Invalid surah number");
  }

  if (
    !Number.isInteger(input.ayahNumber) ||
    input.ayahNumber < 1 ||
    input.ayahNumber > 300
  ) {
    throw new Error("Invalid ayah number");
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 4) {
    throw new Error("Invalid review rating");
  }
}

const newId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useReviewStore = create<ReviewState>((set) => ({
  latestProgress: null,
  dueQueue: [],
  isQueueLoading: false,
  isSaving: false,
  error: null,

  loadDueQueue: async (userId) => {
    set({ isQueueLoading: true, error: null });

    try {
      const nowIso = new Date().toISOString();

      const due = await murajaahDB.ayahProgress
        .where("nextReviewDate")
        .belowOrEqual(nowIso)
        .and((row) => row.userId === userId)
        .toArray();

      due.sort((left, right) =>
        left.nextReviewDate.localeCompare(right.nextReviewDate),
      );

      set({ dueQueue: due, isQueueLoading: false, error: null });
      return due;
    } catch (error) {
      const message = toUserError("REVIEW-QUEUE-001", error);
      set({ isQueueLoading: false, error: message });
      return [];
    }
  },

  loadAyahProgress: async (userId, surahNumber, ayahNumber) => {
    const existing = await murajaahDB.ayahProgress
      .where("[userId+surahNumber+ayahNumber]")
      .equals([userId, surahNumber, ayahNumber])
      .first();

    set({ latestProgress: existing ?? null });

    return existing ?? null;
  },

  rateAyah: async ({ userId, surahNumber, ayahNumber, rating }) => {
    set({ isSaving: true, error: null });

    try {
      validateRateInput({ userId, surahNumber, ayahNumber, rating });

      const existing = await murajaahDB.ayahProgress
        .where("[userId+surahNumber+ayahNumber]")
        .equals([userId, surahNumber, ayahNumber])
        .first();

      const next = calculateSM2(
        rating,
        existing?.easeFactor ?? 2.5,
        existing?.interval ?? 0,
        existing?.repetitions ?? 0,
      );

      const nowIso = new Date().toISOString();
      const row: AyahProgressRow = {
        id: existing?.id ?? newId(),
        userId,
        surahNumber,
        ayahNumber,
        easeFactor: next.easeFactor,
        interval: next.interval,
        repetitions: next.repetitions,
        nextReviewDate: next.nextReviewDate.toISOString(),
        updatedAt: nowIso,
      };

      await murajaahDB.ayahProgress.put(row);
      if (!isGuestUserId(userId)) {
        await enqueueAyahProgressSync(row);

        if (typeof navigator !== "undefined" && navigator.onLine) {
          await processSyncQueue();
        }
      }

      set((state) => ({
        latestProgress: row,
        isSaving: false,
        error: null,
        dueQueue: state.dueQueue.filter((item) => item.id !== row.id),
      }));

      return row;
    } catch (error) {
      const message = toUserError("REVIEW-SAVE-001", error);
      set({ isSaving: false, error: message });
      throw error;
    }
  },
}));
