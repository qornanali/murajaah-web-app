export type SM2Rating = 1 | 2 | 3 | 4;

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

const MIN_EASE_FACTOR = 1.3;

const roundToTwo = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const addDays = (baseDate: Date, days: number): Date => {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
};

export function calculateSM2(
  rating: SM2Rating,
  ease: number,
  interval: number,
  reps: number,
): SM2Result {
  if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
    throw new Error("Invalid SM-2 rating. Expected a value between 1 and 4.");
  }

  const currentEase = Number.isFinite(ease) ? ease : 2.5;
  const currentInterval = Number.isFinite(interval)
    ? Math.max(0, Math.floor(interval))
    : 0;
  const currentReps = Number.isFinite(reps) ? Math.max(0, Math.floor(reps)) : 0;

  let easeFactor = currentEase;
  let nextInterval = currentInterval;
  let repetitions = currentReps;

  if (rating < 3) {
    repetitions = 0;
    nextInterval = 1;
  } else {
    repetitions += 1;

    if (repetitions === 1) {
      nextInterval = 1;
    } else if (repetitions === 2) {
      nextInterval = 6;
    } else {
      nextInterval = Math.max(1, Math.round(currentInterval * easeFactor));
    }
  }

  const quality = rating;
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easeFactor = Math.max(MIN_EASE_FACTOR, roundToTwo(easeFactor + easeDelta));

  const nextReviewDate = addDays(new Date(), nextInterval);

  return {
    easeFactor,
    interval: nextInterval,
    repetitions,
    nextReviewDate,
  };
}
