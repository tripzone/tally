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

// The Monday that starts the calendar week containing `dateStr`.
export function weekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

// Two-line date display: a big primary label (weekday, or Today)
// and a smaller secondary label (the actual month/day) underneath it.
export function formatDisplayDateParts(dateStr: string): { primary: string; secondary: string } {
  const today = todayStr();
  const d = new Date(`${dateStr}T00:00:00`);
  const secondary = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (dateStr === today) return { primary: 'Today', secondary };

  const primary = d.toLocaleDateString(undefined, { weekday: 'short' });
  return { primary, secondary };
}

// 1-indexed day number within the calendar year (Jan 1 -> 1).
export function dayOfYear(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`);
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.round((d.getTime() - start.getTime()) / 86400000) + 1;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

// Fraction (0-1) of the calendar year that has elapsed as of `dateStr`.
export function yearProgress(dateStr: string = todayStr()): number {
  const year = new Date(`${dateStr}T00:00:00`).getFullYear();
  return dayOfYear(dateStr) / daysInYear(year);
}
