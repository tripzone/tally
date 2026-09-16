import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { dayOfYear, todayStr, weekStart, yearProgress } from '../dateUtils';

interface MetricDetailModalProps {
  label: string;
  dailyValues: Record<string, number>;
  statMode: 'sum' | 'average';
  goal: number | null;
  onUpdateGoal: (goal: number | null) => void;
  onClose: () => void;
  onNavigate: (direction: 1 | -1) => void;
}

const SWIPE_THRESHOLD = 40;

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
  onNavigate,
}: MetricDetailModalProps) {
  const series = useMemo(() => computeWeeklySeries(dailyValues, statMode), [dailyValues, statMode]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState(goal != null ? String(goal) : '');
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNavigate(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNavigate(-1);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onNavigate]);

  function handleTouchStart(e: ReactTouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: ReactTouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) onNavigate(dx < 0 ? 1 : -1);
  }

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

  // X axis spans Jan 1 through today -- not the full year -- so the pace
  // line's slope reflects the full-year target while only showing the
  // portion of it that's actually elapsed (it won't reach the goal until
  // the last day of the year).
  const today = todayStr();
  const referenceYear = new Date(`${today}T00:00:00`).getFullYear();
  const daysElapsed = dayOfYear(today);

  function xAt(dateStr: string): number {
    if (daysElapsed <= 1) return PAD.left;
    return PAD.left + ((dayOfYear(dateStr) - 1) / (daysElapsed - 1)) * innerWidth;
  }
  function yAt(value: number): number {
    return PAD.top + (1 - (value - minY) / spanY) * innerHeight;
  }

  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.week)} ${yAt(p.value)}`).join(' ');
  const lastPoint = series[series.length - 1];
  const hovered = hoverIndex != null ? series[hoverIndex] : null;

  const paceToday = goal != null ? goal * yearProgress(today) : null;
  const paceLinePath =
    goal != null && paceToday != null
      ? `M ${xAt(`${referenceYear}-01-01`)} ${yAt(0)} L ${xAt(today)} ${yAt(paceToday)}`
      : null;

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (series.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    series.forEach((p, i) => {
      const dist = Math.abs(xAt(p.week) - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal metric-detail-modal"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="metric-nav-header">
          <button type="button" className="metric-nav-btn" onClick={() => onNavigate(-1)} aria-label="Previous metric">
            ‹
          </button>
          <h2>{label}</h2>
          <button type="button" className="metric-nav-btn" onClick={() => onNavigate(1)} aria-label="Next metric">
            ›
          </button>
        </div>
        <p className="settings-hint">Cumulative {statMode === 'average' ? 'average' : 'total'} by week</p>
        {goal != null && (
          <p className="settings-hint chart-pace-hint">Dotted line = pace to reach the goal by Dec 31</p>
        )}

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

              {paceLinePath && <path d={paceLinePath} className="chart-pace-line" fill="none" />}

              <path d={linePath} className="chart-line" fill="none" />

              {series.map((p, i) => (
                <circle
                  key={p.week}
                  cx={xAt(p.week)}
                  cy={yAt(p.value)}
                  r={i === hoverIndex ? 4 : 2.5}
                  className="chart-dot"
                />
              ))}

              {paceToday != null && (
                <circle cx={xAt(today)} cy={yAt(paceToday)} r={3.5} className="chart-pace-dot" />
              )}

              {hovered && hoverIndex != null && (
                <line
                  x1={xAt(hovered.week)}
                  y1={PAD.top}
                  x2={xAt(hovered.week)}
                  y2={CHART_HEIGHT - PAD.bottom}
                  className="chart-crosshair"
                />
              )}

              {lastPoint && (
                <text x={xAt(lastPoint.week)} y={yAt(lastPoint.value) - 8} className="chart-value-label" textAnchor="end">
                  {lastPoint.value}
                </text>
              )}

              <text x={PAD.left} y={CHART_HEIGHT - 6} className="chart-axis-label">
                Jan 1
              </text>
              <text x={CHART_WIDTH - PAD.right} y={CHART_HEIGHT - 6} className="chart-axis-label" textAnchor="end">
                Today
              </text>
            </svg>

            <div className={`chart-tooltip ${hovered ? '' : 'chart-tooltip-empty'}`}>
              {hovered ? (
                <>
                  Week of {formatWeekLabel(hovered.week)}: <strong>{hovered.value}</strong>
                </>
              ) : (
                ' '
              )}
            </div>
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
