export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// Ascending list of date strings from `start` to `end` inclusive.
export function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

// Two-line date display: a big primary label (weekday, or Today/Yesterday)
// and a smaller secondary label (the actual month/day) underneath it.
export function formatDisplayDateParts(dateStr: string): { primary: string; secondary: string } {
  const today = todayStr();
  const d = new Date(`${dateStr}T00:00:00`);
  const secondary = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (dateStr === today) return { primary: 'Today', secondary };
  if (dateStr === addDays(today, -1)) return { primary: 'Yesterday', secondary };

  const primary = d.toLocaleDateString(undefined, { weekday: 'short' });
  return { primary, secondary };
}
