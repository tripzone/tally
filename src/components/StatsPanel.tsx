import type { Activity, DaysMap } from '../types';

interface StatsPanelProps {
  activities: Activity[];
  days: DaysMap;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function StatsPanel({ activities, days }: StatsPanelProps) {
  const sums = activities.map((activity) => {
    let sum = 0;
    for (const dateStr in days) {
      sum += days[dateStr][activity.id] ?? 0;
    }
    return { activity, sum: round(sum) };
  });
  const grandTotal = round(sums.reduce((acc, s) => acc + s.sum, 0));

  return (
    <div className="stats-panel">
      <div className="stats-tiles">
        {sums.map(({ activity, sum }) => (
          <div key={activity.id} className="stat-tile">
            <span className="stat-tile-label">{activity.name}</span>
            <span className="stat-tile-value">{sum.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <div className="stats-grand-total">
        <span className="grand-total-label">Total</span>
        <span className="grand-total-value">{grandTotal.toFixed(1)}</span>
      </div>
    </div>
  );
}
