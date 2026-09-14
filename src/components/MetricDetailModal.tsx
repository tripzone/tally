import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { weekStart } from '../dateUtils';

interface MetricDetailModalProps {
  label: string;
  dailyValues: Record<string, number>;
  statMode: 'sum' | 'average';
  goal: number | null;
  onUpdateGoal: (goal: number | null) => void;
  onClose: () => void;
}

interface WeekPoint {
  week: string; // Monday date, YYYY-MM-DD
  value: number;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function computeWeeklySeries(dailyValues: Record<string, number>, statMode: 'sum' | 'average'): WeekPoint[] {
  const dates = Object.keys(dailyValues).sort();
  if (dates.length === 0) return [];

  const weekTotals = new Map<string, { sum: number; count: number }>();
  for (const dateStr of dates) {
    const ws = weekStart(dateStr);
    const entry = weekTotals.get(ws) ?? { sum: 0, count: 0 };
    entry.sum += dailyValues[dateStr];
    entry.count += 1;
    weekTotals.set(ws, entry);
  }

  const sortedWeeks = [...weekTotals.keys()].sort();
  let cumSum = 0;
  let cumCount = 0;
  return sortedWeeks.map((ws) => {
    const { sum, count } = weekTotals.get(ws)!;
    cumSum += sum;
    cumCount += count;
    const value = statMode === 'average' ? (cumCount > 0 ? cumSum / cumCount : 0) : cumSum;
    return { week: ws, value: round(value) };
  });
}

function formatWeekLabel(weekStr: string): string {
  const d = new Date(`${weekStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PAD = { top: 20, right: 12, bottom: 24, left: 12 };

export default function MetricDetailModal({
  label,
  dailyValues,
  statMode,
  goal,
  onUpdateGoal,
  onClose,
}: MetricDetailModalProps) {
  const series = useMemo(() => computeWeeklySeries(dailyValues, statMode), [dailyValues, statMode]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState(goal != null ? String(goal) : '');

  function commitGoal() {
    const trimmed = goalInput.trim();
    if (trimmed === '') {
      if (goal != null) onUpdateGoal(null);
      return;
    }
    const num = Number(trimmed);
    if (!Number.isNaN(num) && num !== goal) onUpdateGoal(num);
  }

  const values = series.map((p) => p.value);
  const allValues = goal != null ? [...values, goal] : values;
  const minY = Math.min(0, ...allValues);
  const maxY = Math.max(...allValues, 0.1);
  const spanY = maxY - minY || 1;

  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;

  function xAt(i: number): number {
    if (series.length <= 1) return PAD.left + innerWidth / 2;
    return PAD.left + (i / (series.length - 1)) * innerWidth;
  }
  function yAt(value: number): number {
    return PAD.top + (1 - (value - minY) / spanY) * innerHeight;
  }

  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(p.value)}`).join(' ');
  const lastPoint = series[series.length - 1];
  const hovered = hoverIndex != null ? series[hoverIndex] : null;

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (series.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    series.forEach((_, i) => {
      const dist = Math.abs(xAt(i) - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal metric-detail-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{label}</h2>
        <p className="settings-hint">Cumulative {statMode === 'average' ? 'average' : 'total'} by week</p>

        {series.length === 0 ? (
          <p className="metric-chart-empty">No data yet.</p>
        ) : (
          <div className="metric-chart">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="metric-chart-svg"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            >
              <line x1={PAD.left} y1={yAt(0)} x2={CHART_WIDTH - PAD.right} y2={yAt(0)} className="chart-baseline" />

              {goal != null && (
                <>
                  <line
                    x1={PAD.left}
                    y1={yAt(goal)}
                    x2={CHART_WIDTH - PAD.right}
                    y2={yAt(goal)}
                    className="chart-goal-line"
                  />
                  <text x={CHART_WIDTH - PAD.right} y={yAt(goal) - 4} className="chart-goal-label" textAnchor="end">
                    Goal {goal}
                  </text>
                </>
              )}

              <path d={linePath} className="chart-line" fill="none" />

              {series.map((p, i) => (
                <circle key={p.week} cx={xAt(i)} cy={yAt(p.value)} r={i === hoverIndex ? 4 : 2.5} className="chart-dot" />
              ))}

              {hovered && hoverIndex != null && (
                <line
                  x1={xAt(hoverIndex)}
                  y1={PAD.top}
                  x2={xAt(hoverIndex)}
                  y2={CHART_HEIGHT - PAD.bottom}
                  className="chart-crosshair"
                />
              )}

              {lastPoint && (
                <text x={xAt(series.length - 1)} y={yAt(lastPoint.value) - 8} className="chart-value-label" textAnchor="end">
                  {lastPoint.value}
                </text>
              )}

              <text x={PAD.left} y={CHART_HEIGHT - 6} className="chart-axis-label">
                {formatWeekLabel(series[0].week)}
              </text>
              <text x={CHART_WIDTH - PAD.right} y={CHART_HEIGHT - 6} className="chart-axis-label" textAnchor="end">
                {formatWeekLabel(series[series.length - 1].week)}
              </text>
            </svg>

            {hovered && (
              <div className="chart-tooltip">
                Week of {formatWeekLabel(hovered.week)}: <strong>{hovered.value}</strong>
              </div>
            )}
          </div>
        )}

        <label className="goal-row">
          <span className="goal-row-label">Goal</span>
          <input
            className="settings-name-input goal-input"
            inputMode="decimal"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onBlur={commitGoal}
            placeholder="No goal"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
