const WAQF_MARKS_SPLIT = /([ۚۘۗۖۙ])/g;
const WAQF_MARK_SINGLE = /^[ۚۘۗۖۙ]$/;

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
