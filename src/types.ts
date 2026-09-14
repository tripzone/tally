export type ActivityType = 'positive' | 'negative';

export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
}

// activityId -> score for a single day
export type DayScores = Record<string, number>;

// dateStr (YYYY-MM-DD) -> DayScores
export type DaysMap = Record<string, DayScores>;

export type TapMode = 'add' | 'remove';
