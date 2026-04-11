function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoToDayKey(iso: string): string | null {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return toDayKey(value);
}

export interface StreakSnapshot {
  current: number;
  longest: number;
}

export function calculateStreakFromIsoDates(dates: string[]): StreakSnapshot {
  const uniqueDays = new Set<string>();

  dates.forEach((iso) => {
    const dayKey = parseIsoToDayKey(iso);
    if (dayKey) {
      uniqueDays.add(dayKey);
    }
  });

  if (uniqueDays.size === 0) {
    return { current: 0, longest: 0 };
  }

  const sortedDays = Array.from(uniqueDays).sort();

  let longest = 1;
  let running = 1;

  for (let index = 1; index < sortedDays.length; index += 1) {
    const previous = new Date(`${sortedDays[index - 1]}T00:00:00`);
    const current = new Date(`${sortedDays[index]}T00:00:00`);
    const diffDays = Math.round(
      (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (diffDays === 1) {
      running += 1;
    } else {
      running = 1;
    }

    if (running > longest) {
      longest = running;
    }
  }

  const todayKey = toDayKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDayKey(yesterday);
  const activeToday = uniqueDays.has(todayKey);
  const activeYesterday = uniqueDays.has(yesterdayKey);

  if (!activeToday && !activeYesterday) {
    return { current: 0, longest };
  }

  const tailAnchor = activeToday ? todayKey : yesterdayKey;
  const tailDate = new Date(`${tailAnchor}T00:00:00`);

  let current = 0;
  const safetyCap = 36500;

  for (let i = 0; i < safetyCap; i += 1) {
    const dayKey = toDayKey(tailDate);
    if (!uniqueDays.has(dayKey)) {
      break;
    }

    current += 1;
    tailDate.setDate(tailDate.getDate() - 1);
  }

  return { current, longest };
}
