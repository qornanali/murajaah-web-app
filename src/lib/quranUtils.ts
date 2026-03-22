const WAQF_MARKS_SPLIT = /([ۚۘۗۖۙ])/g;
const WAQF_MARK_SINGLE = /^[ۚۘۗۖۙ]$/;

interface RevealDurationOptions {
  minSeconds?: number;
  maxSeconds?: number;
  charsPerSecond?: number;
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parsePositiveNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const DEFAULT_REVEAL_MIN_SECONDS = parsePositiveIntEnv(
  "NEXT_PUBLIC_REVEAL_MIN_SECONDS",
  6,
);
const DEFAULT_REVEAL_MAX_SECONDS = parsePositiveIntEnv(
  "NEXT_PUBLIC_REVEAL_MAX_SECONDS",
  20,
);
const DEFAULT_REVEAL_CHARS_PER_SECOND = parsePositiveNumberEnv(
  "NEXT_PUBLIC_REVEAL_CHARS_PER_SECOND",
  12,
);

export function splitAyahByWaqf(text: string): string[] {
  const normalized = text.trim();

  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  const parts = normalized.split(WAQF_MARKS_SPLIT);

  let currentChunk = "";

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (WAQF_MARK_SINGLE.test(part)) {
      currentChunk = `${currentChunk}${part}`.trim();
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = "";
      continue;
    }

    currentChunk = `${currentChunk} ${part}`.trim();
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [normalized];
}

export function estimateRevealDurationSeconds(
  text: string,
  options?: RevealDurationOptions,
): number {
  const minSeconds = options?.minSeconds ?? DEFAULT_REVEAL_MIN_SECONDS;
  const maxSeconds =
    options?.maxSeconds ?? Math.max(DEFAULT_REVEAL_MAX_SECONDS, minSeconds);
  const charsPerSecond =
    options?.charsPerSecond ?? DEFAULT_REVEAL_CHARS_PER_SECOND;
  const normalized = text.replace(/\s+/g, "").trim();

  if (!normalized) {
    return minSeconds;
  }

  const estimated = Math.ceil(normalized.length / Math.max(charsPerSecond, 1));
  return Math.min(maxSeconds, Math.max(minSeconds, estimated));
}
