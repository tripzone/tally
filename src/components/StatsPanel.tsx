import { useState } from 'react';
import type { Activity, DaysMap, TapMode } from '../types';
import ModeToggle from './ModeToggle';
import MetricDetailModal from './MetricDetailModal';

interface StatsPanelProps {
  activities: Activity[];
  days: DaysMap;
  totalGoal: number | null;
  mode: TapMode;
  onModeChange: (mode: TapMode) => void;
  onUpdateActivity: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
  onUpdateTotalGoal: (goal: number | null) => void;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function goalPercent(value: number, goal: number | null | undefined): number | null {
  if (goal == null || goal === 0) return null;
  return Math.round((value / goal) * 100);
}

export default function StatsPanel({
  activities,
  days,
  totalGoal,
  mode,
  onModeChange,
  onUpdateActivity,
  onUpdateTotalGoal,
}: StatsPanelProps) {
  const [selected, setSelected] = useState<string | 'total' | null>(null);

  const numericActivities = activities.filter((a) => a.kind === 'number' && a.showInMetrics !== false);
  const contributingActivities = activities.filter((a) => a.kind === 'number' && a.contributeToTotal !== false);

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
    contributingActivities.reduce((acc, activity) => {
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

  function activityDailyValues(activity: Activity): Record<string, number> {
    const out: Record<string, number> = {};
    for (const dateStr in days) {
      const value = days[dateStr][activity.id];
      if (typeof value === 'number') out[dateStr] = value;
    }
    return out;
  }

  function totalDailyValues(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const dateStr in days) {
      out[dateStr] = contributingActivities.reduce((sum, a) => {
        const value = days[dateStr][a.id];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    }
    return out;
  }

  const selectedActivity =
    selected && selected !== 'total' ? numericActivities.find((a) => a.id === selected) : null;

  return (
    <div className="stats-panel">
      <div className="stats-toolbar">
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      <div className="stats-tiles">
        {stats.map(({ activity, value }) => {
          const percent = goalPercent(value, activity.goal);
          return (
            <button key={activity.id} type="button" className="stat-box" onClick={() => setSelected(activity.id)}>
              <span className="stat-box-label">{activity.name}</span>
              <span className="stat-box-value">{value.toFixed(1)}</span>
              {percent !== null && <span className="stat-box-goal">{percent}% of goal</span>}
            </button>
          );
        })}
      </div>

      <button type="button" className="total-block" onClick={() => setSelected('total')}>
        <span className="total-block-label">Total</span>
        <span className="total-block-value">{grandTotal.toFixed(1)}</span>
        {totalPercent !== null && <span className="total-block-goal">{totalPercent}% of goal</span>}
      </button>

      {selected === 'total' && (
        <MetricDetailModal
          label="Total"
          dailyValues={totalDailyValues()}
          statMode="sum"
          goal={totalGoal}
          onUpdateGoal={onUpdateTotalGoal}
          onClose={() => setSelected(null)}
        />
      )}

      {selectedActivity && (
        <MetricDetailModal
          label={selectedActivity.name}
          dailyValues={activityDailyValues(selectedActivity)}
          statMode={selectedActivity.statMode === 'average' ? 'average' : 'sum'}
          goal={selectedActivity.goal ?? null}
          onUpdateGoal={(goal) => onUpdateActivity(selectedActivity.id, { goal })}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
