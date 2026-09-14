export type ActivityType = 'positive' | 'negative';
export type ActivityKind = 'number' | 'text';
export type StatMode = 'sum' | 'average';

export interface Activity {
  id: string;
  name: string;
  kind: ActivityKind;
  // Everything below only applies when kind === 'number'. Omit (don't set
  // to undefined -- Firestore rejects that) rather than including when the
  // column is text.
  type?: ActivityType;
  statMode?: StatMode; // default 'sum'
  showInMetrics?: boolean; // default true
  contributeToTotal?: boolean; // default true
  goal?: number | null; // optional annual target
}

// activityId -> value for a single day (a number for numeric activities, a
// string for text activities)
export type DayValue = number | string;
export type DayScores = Record<string, DayValue>;

// dateStr (YYYY-MM-DD) -> DayScores
export type DaysMap = Record<string, DayScores>;

export type TapMode = 'add' | 'remove';
