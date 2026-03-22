const WAQF_MARKS_SPLIT = /([ۚۘۗۖۙ])/g;
const WAQF_MARK_SINGLE = /^[ۚۘۗۖۙ]$/;

interface RevealDurationOptions {
  minSeconds?: number;
  maxSeconds?: number;
  charsPerSecond?: number;
}

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
  const minSeconds = options?.minSeconds ?? 6;
  const maxSeconds = options?.maxSeconds ?? 20;
  const charsPerSecond = options?.charsPerSecond ?? 12;
  const normalized = text.replace(/\s+/g, "").trim();

  if (!normalized) {
    return minSeconds;
  }

  const estimated = Math.ceil(normalized.length / Math.max(charsPerSecond, 1));
  return Math.min(maxSeconds, Math.max(minSeconds, estimated));
}
