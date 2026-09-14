import type { Activity, DaysMap, TapMode } from '../types';
import ModeToggle from './ModeToggle';

interface StatsPanelProps {
  activities: Activity[];
  days: DaysMap;
  totalGoal: number | null;
  mode: TapMode;
  onModeChange: (mode: TapMode) => void;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function goalPercent(value: number, goal: number | null | undefined): number | null {
  if (goal == null || goal === 0) return null;
  return Math.round((value / goal) * 100);
}

export default function StatsPanel({ activities, days, totalGoal, mode, onModeChange }: StatsPanelProps) {
  const numericActivities = activities.filter((a) => a.kind === 'number' && a.showInMetrics !== false);

  const stats = numericActivities.map((activity) => {
    let sum = 0;
    let count = 0;
    for (const dateStr in days) {
      const value = days[dateStr][activity.id];
      if (typeof value === 'number') {
        sum += value;
        count += 1;
      }
    }
    const value = activity.statMode === 'average' ? (count > 0 ? sum / count : 0) : sum;
    return { activity, value: round(value) };
  });

  const grandTotal = round(
    activities
      .filter((a) => a.kind === 'number' && a.contributeToTotal !== false)
      .reduce((acc, activity) => {
        let sum = 0;
        let count = 0;
        for (const dateStr in days) {
          const value = days[dateStr][activity.id];
          if (typeof value === 'number') {
            sum += value;
            count += 1;
          }
        }
        return acc + (activity.statMode === 'average' ? (count > 0 ? sum / count : 0) : sum);
      }, 0)
  );
  const totalPercent = goalPercent(grandTotal, totalGoal);

  return (
    <div className="stats-panel">
      <div className="stats-toolbar">
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      <div className="stats-tiles">
        {stats.map(({ activity, value }) => {
          const percent = goalPercent(value, activity.goal);
          return (
            <div key={activity.id} className="stat-box">
              <span className="stat-box-label">{activity.name}</span>
              <span className="stat-box-value">{value.toFixed(1)}</span>
              {percent !== null && <span className="stat-box-goal">{percent}% of goal</span>}
            </div>
          );
        })}
      </div>

      <div className="total-block">
        <span className="total-block-label">Total</span>
        <span className="total-block-value">{grandTotal.toFixed(1)}</span>
        {totalPercent !== null && <span className="total-block-goal">{totalPercent}% of goal</span>}
      </div>
    </div>
  );
}
