import { useState } from 'react';
import type { Activity, DaysMap, TapMode } from '../types';
import { yearProgress } from '../dateUtils';
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

// How far ahead (positive) or behind (negative) `value` is compared to a
// straight-line pace toward `goal` by the end of the year -- both as a
// percent-of-goal difference and as raw points (value vs. what the pace
// line says you should have by now).
function paceDeviation(value: number, goal: number | null | undefined): { percent: number; points: number } | null {
  if (goal == null || goal === 0) return null;
  const progress = yearProgress();
  const percent = Math.round((value / goal) * 100) - Math.round(progress * 100);
  const points = value - goal * progress;
  return { percent, points };
}

function DeviationLabel({ value, goal }: { value: number; goal: number | null | undefined }) {
  const deviation = paceDeviation(value, goal);
  if (deviation === null) return null;
  const { percent, points } = deviation;
  const pointsStr = points >= 0 ? `+${points.toFixed(1)}` : points.toFixed(1);
  return (
    <span className={`stat-deviation ${percent >= 0 ? 'ahead' : 'behind'}`}>
      {percent >= 0 ? `+${percent}` : percent}% ({pointsStr} pts) vs pace
    </span>
  );
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

  const allNumberActivities = activities.filter((a) => a.kind === 'number');
  const numericActivities = allNumberActivities.filter((a) => a.showInMetrics !== false);
  const contributingActivities = allNumberActivities.filter((a) => a.contributeToTotal !== false);
  // Every number activity, shown-in-metrics or not, plus Total -- the full
  // set you can step through with the prev/next controls in the detail
  // modal, even for metrics that don't have a card below.
  const navOrder: (string | 'total')[] = [...allNumberActivities.map((a) => a.id), 'total'];

  function computeActivityValue(activity: Activity): number {
    let sum = 0;
    let count = 0;
    for (const dateStr in days) {
      const value = days[dateStr][activity.id];
      if (typeof value === 'number') {
        sum += value;
        count += 1;
      }
    }
    return activity.statMode === 'average' ? (count > 0 ? sum / count : 0) : sum;
  }

  const stats = numericActivities.map((activity) => ({ activity, value: round(computeActivityValue(activity)) }));

  // Negative-type values are stored as negative numbers, so summing
  // everything together already nets positive minus negative -- split by
  // type here just to show the "positive - negative = total" breakdown.
  const positiveTotal = round(
    contributingActivities.filter((a) => a.type !== 'negative').reduce((acc, a) => acc + computeActivityValue(a), 0)
  );
  const negativeTotal = round(
    contributingActivities.filter((a) => a.type === 'negative').reduce((acc, a) => acc + computeActivityValue(a), 0)
  );
  const grandTotal = round(positiveTotal + negativeTotal);
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
    selected && selected !== 'total' ? allNumberActivities.find((a) => a.id === selected) : null;

  function handleNavigate(direction: 1 | -1) {
    if (selected == null) return;
    const idx = navOrder.indexOf(selected);
    if (idx === -1) return;
    const nextIdx = (idx + direction + navOrder.length) % navOrder.length;
    setSelected(navOrder[nextIdx]);
  }

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
              <DeviationLabel value={value} goal={activity.goal} />
            </button>
          );
        })}
      </div>

      <button type="button" className="total-block" onClick={() => setSelected('total')}>
        <span className="total-block-label">Total</span>
        <span className="total-block-value">{grandTotal.toFixed(1)}</span>
        <span className="total-block-formula">
          {positiveTotal.toFixed(1)} − {Math.abs(negativeTotal).toFixed(1)}
        </span>
        {totalPercent !== null && <span className="total-block-goal">{totalPercent}% of goal</span>}
        <DeviationLabel value={grandTotal} goal={totalGoal} />
      </button>

      {selected === 'total' && (
        <MetricDetailModal
          key="total"
          label="Total"
          dailyValues={totalDailyValues()}
          statMode="sum"
          goal={totalGoal}
          onUpdateGoal={onUpdateTotalGoal}
          onClose={() => setSelected(null)}
          onNavigate={handleNavigate}
        />
      )}

      {selectedActivity && (
        <MetricDetailModal
          key={selectedActivity.id}
          label={selectedActivity.name}
          dailyValues={activityDailyValues(selectedActivity)}
          statMode={selectedActivity.statMode === 'average' ? 'average' : 'sum'}
          goal={selectedActivity.goal ?? null}
          onUpdateGoal={(goal) => onUpdateActivity(selectedActivity.id, { goal })}
          onClose={() => setSelected(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
