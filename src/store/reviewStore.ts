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

interface SessionRelearnInput {
  surahNumber: number;
  ayahNumber: number;
  rating: SM2Rating;
}

export interface SessionRelearnItem {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  attempts: number;
  lastRating: SM2Rating;
}

export interface SurahMastery {
  surahNumber: number;
  totalAyahs: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  forwardMastery: boolean;
  randomMastery: boolean;
}

interface ReviewState {
  latestProgress: AyahProgressRow | null;
  dueQueue: AyahProgressRow[];
  sessionRelearnQueue: SessionRelearnItem[];
  isQueueLoading: boolean;
  isSaving: boolean;
  error: string | null;
  rateAyah: (input: RateAyahInput) => Promise<AyahProgressRow>;
  enqueueSessionRelearn: (input: SessionRelearnInput) => SessionRelearnItem[];
  resolveSessionRelearn: (verseKey: string) => SessionRelearnItem[];
  clearSessionRelearn: () => void;
  loadDueQueue: (userId: string) => Promise<AyahProgressRow[]>;
  loadAyahProgress: (
    userId: string,
    surahNumber: number,
    ayahNumber: number,
  ) => Promise<AyahProgressRow | null>;
  calculateSurahMastery: (
    userId: string,
    surahNumber: number,
    ayahCount: number,
  ) => Promise<SurahMastery>;
  restoreAyahProgress: (
    prevRow: AyahProgressRow | null,
    currentRow: AyahProgressRow,
  ) => Promise<void>;
  restoreSessionRelearnQueue: (queue: SessionRelearnItem[]) => void;
}

function SURAH_AYAH_COUNTS(): Record<number, number> {
  return {
    1: 7,
    2: 286,
    3: 200,
    4: 176,
    5: 120,
    6: 165,
    7: 206,
    8: 75,
    9: 129,
    10: 109,
    11: 123,
    12: 111,
    13: 43,
    14: 52,
    15: 99,
    16: 128,
    17: 111,
    18: 110,
    19: 98,
    20: 135,
    21: 112,
    22: 78,
    23: 118,
    24: 64,
    25: 77,
    26: 227,
    27: 93,
    28: 88,
    29: 69,
    30: 60,
    31: 34,
    32: 30,
    33: 73,
    34: 54,
    35: 45,
    36: 83,
    37: 182,
    38: 88,
    39: 75,
    40: 85,
    41: 54,
    42: 53,
    43: 89,
    44: 59,
    45: 37,
    46: 35,
    47: 38,
    48: 29,
    49: 18,
    50: 45,
    51: 60,
    52: 49,
    53: 62,
    54: 55,
    55: 78,
    56: 96,
    57: 29,
    58: 22,
    59: 24,
    60: 13,
    61: 14,
    62: 11,
    63: 11,
    64: 18,
    65: 12,
    66: 12,
    67: 30,
    68: 52,
    69: 52,
    70: 44,
    71: 28,
    72: 28,
    73: 20,
    74: 56,
    75: 40,
    76: 31,
    77: 50,
    78: 40,
    79: 46,
    80: 42,
    81: 29,
    82: 19,
    83: 36,
    84: 25,
    85: 22,
    86: 17,
    87: 19,
    88: 26,
    89: 30,
    90: 20,
    91: 15,
    92: 21,
    93: 11,
    94: 8,
    95: 8,
    96: 19,
    97: 5,
    98: 8,
    99: 8,
    100: 11,
    101: 11,
    102: 8,
    103: 3,
    104: 9,
    105: 5,
    106: 4,
    107: 7,
    108: 3,
    109: 6,
    110: 3,
    111: 5,
    112: 4,
    113: 5,
    114: 6,
  };
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

const toVerseKey = (surahNumber: number, ayahNumber: number) =>
  `${surahNumber}:${ayahNumber}`;

export const useReviewStore = create<ReviewState>((set) => ({
  latestProgress: null,
  dueQueue: [],
  sessionRelearnQueue: [],
  isQueueLoading: false,
  isSaving: false,
  error: null,

  enqueueSessionRelearn: ({ surahNumber, ayahNumber, rating }) => {
    let nextQueue: SessionRelearnItem[] = [];

    set((state) => {
      const verseKey = toVerseKey(surahNumber, ayahNumber);
      const existingItem = state.sessionRelearnQueue.find(
        (item) => item.verseKey === verseKey,
      );
      const updatedItem: SessionRelearnItem = {
        verseKey,
        surahNumber,
        ayahNumber,
        attempts: (existingItem?.attempts ?? 0) + 1,
        lastRating: rating,
      };

      nextQueue = [
        ...state.sessionRelearnQueue.filter(
          (item) => item.verseKey !== verseKey,
        ),
        updatedItem,
      ];

      return { sessionRelearnQueue: nextQueue };
    });

    return nextQueue;
  },

  resolveSessionRelearn: (verseKey) => {
    let nextQueue: SessionRelearnItem[] = [];

    set((state) => {
      nextQueue = state.sessionRelearnQueue.filter(
        (item) => item.verseKey !== verseKey,
      );

      return { sessionRelearnQueue: nextQueue };
    });

    return nextQueue;
  },

  clearSessionRelearn: () => {
    set({ sessionRelearnQueue: [] });
  },

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

  calculateSurahMastery: async (userId, surahNumber, ayahCount) => {
    const surahAyahCounts = SURAH_AYAH_COUNTS();
    const totalAyahs = surahAyahCounts[surahNumber] || ayahCount;

    const allProgress = await murajaahDB.ayahProgress
      .where("[userId+surahNumber+ayahNumber]")
      .between([userId, surahNumber, 0], [userId, surahNumber, totalAyahs + 1])
      .toArray();

    const MATURE_INTERVAL = 30;
    const LEARNING_INTERVAL = 1;

    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;
    let consecutiveMastered = 0;
    let forwardMastery = false;
    let randomMasteryCount = 0;

    const progressMap = new Map(allProgress.map((p) => [p.ayahNumber, p]));

    for (let ayahNum = 1; ayahNum <= totalAyahs; ayahNum++) {
      const progress = progressMap.get(ayahNum);

      if (!progress || progress.repetitions === 0) {
        newCount++;
        if (ayahNum === 1) consecutiveMastered = 0;
        else if (consecutiveMastered > 0) {
          forwardMastery = consecutiveMastered >= 10;
        }
      } else if (progress.interval >= MATURE_INTERVAL) {
        masteredCount++;
        if (ayahNum === 1 || consecutiveMastered === ayahNum - 1) {
          consecutiveMastered = ayahNum;
        }
        randomMasteryCount++;
      } else if (progress.interval >= LEARNING_INTERVAL) {
        learningCount++;
        if (ayahNum === 1) consecutiveMastered = 0;
        else if (consecutiveMastered > 0) {
          forwardMastery = consecutiveMastered >= 10;
        }
      } else {
        newCount++;
        if (ayahNum === 1) consecutiveMastered = 0;
        else if (consecutiveMastered > 0) {
          forwardMastery = consecutiveMastered >= 10;
        }
      }
    }

    forwardMastery = consecutiveMastered >= 10;
    const randomMastery = randomMasteryCount >= totalAyahs * 0.9;

    return {
      surahNumber,
      totalAyahs,
      newCount,
      learningCount,
      masteredCount,
      forwardMastery,
      randomMastery,
    };
  },

  restoreAyahProgress: async (prevRow, currentRow) => {
    if (prevRow) {
      await murajaahDB.ayahProgress.put(prevRow);
    } else {
      await murajaahDB.ayahProgress.delete(currentRow.id);
    }
    set((state) => ({
      latestProgress: prevRow,
      dueQueue: prevRow
        ? state.dueQueue.some((r) => r.id === prevRow.id)
          ? state.dueQueue
          : [...state.dueQueue, prevRow]
        : state.dueQueue,
    }));
  },

  restoreSessionRelearnQueue: (queue) => {
    set({ sessionRelearnQueue: queue });
  },
}));
