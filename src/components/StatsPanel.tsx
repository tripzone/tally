import type { Activity, DaysMap } from '../types';

interface StatsPanelProps {
  activities: Activity[];
  days: DaysMap;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function StatsPanel({ activities, days }: StatsPanelProps) {
  const numericActivities = activities.filter((a) => a.kind !== 'text');

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
    const averaged = activity.kind === 'numeric-average';
    const value = averaged ? (count > 0 ? sum / count : 0) : sum;
    return { activity, value: round(value), averaged };
  });
  const grandTotal = round(stats.filter((s) => !s.averaged).reduce((acc, s) => acc + s.value, 0));

  return (
    <div className="stats-panel">
      <div className="stats-tiles">
        {stats.map(({ activity, value, averaged }) => (
          <div key={activity.id} className="stat-box">
            <span className="stat-box-label">
              {activity.name}
              {averaged ? ' · avg' : ''}
            </span>
            <span className="stat-box-value">{value.toFixed(1)}</span>
          </div>
        ))}
        <div className="stat-box stat-box-total">
          <span className="stat-box-label">Total</span>
          <span className="stat-box-value">{grandTotal.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
