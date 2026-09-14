export type ActivityType = 'positive' | 'negative';

// numeric-total: tappable +/-0.5, summed into daily/all-time totals.
// numeric-average: tappable +/-0.5, but stats show an average and it's
//   excluded from totals (e.g. a mood rating).
// text: a free-text note per day, not tappable, never contributes to totals.
export type ActivityKind = 'numeric-total' | 'numeric-average' | 'text';

export interface Activity {
  id: string;
  name: string;
  kind: ActivityKind;
  // Only meaningful for numeric kinds -- controls tap direction/styling.
  type?: ActivityType;
}

// activityId -> value for a single day (a number for numeric activities, a
// string for text activities)
export type DayValue = number | string;
export type DayScores = Record<string, DayValue>;

// dateStr (YYYY-MM-DD) -> DayScores
export type DaysMap = Record<string, DayScores>;

export type TapMode = 'add' | 'remove';
