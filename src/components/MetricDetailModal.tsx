import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { addDays, dayOfYear, monthEnd, monthStart, todayStr, weekStart, yearProgress } from '../dateUtils';

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

type ViewMode = 'bar' | 'cumulative';
type Grain = 'week' | 'month';

interface PeriodPoint {
  start: string; // YYYY-MM-DD, start of the week/month
  end: string; // YYYY-MM-DD, end of the week/month (may be in the future)
  value: number;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function periodsPerYear(grain: Grain): number {
  return grain === 'week' ? 52 : 12;
}

function computeSeries(
  dailyValues: Record<string, number>,
  statMode: 'sum' | 'average',
  viewMode: ViewMode,
  grain: Grain
): PeriodPoint[] {
  const dates = Object.keys(dailyValues).sort();
  if (dates.length === 0) return [];

  const totals = new Map<string, { sum: number; count: number }>();
  for (const dateStr of dates) {
    const key = grain === 'week' ? weekStart(dateStr) : monthStart(dateStr);
    const entry = totals.get(key) ?? { sum: 0, count: 0 };
    entry.sum += dailyValues[dateStr];
    entry.count += 1;
    totals.set(key, entry);
  }

  const sortedKeys = [...totals.keys()].sort();
  let cumSum = 0;
  let cumCount = 0;
  return sortedKeys.map((key) => {
    const { sum, count } = totals.get(key)!;
    cumSum += sum;
    cumCount += count;
    const periodValue = statMode === 'average' ? (count > 0 ? sum / count : 0) : sum;
    const cumulativeValue = statMode === 'average' ? (cumCount > 0 ? cumSum / cumCount : 0) : cumSum;
    return {
      start: key,
      end: grain === 'week' ? addDays(key, 6) : monthEnd(key),
      value: round(viewMode === 'cumulative' ? cumulativeValue : periodValue),
    };
  });
}

function formatPeriodLabel(dateStr: string, grain: Grain): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (grain === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
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
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [grain, setGrain] = useState<Grain>('week');
  const series = useMemo(
    () => computeSeries(dailyValues, statMode, viewMode, grain),
    [dailyValues, statMode, viewMode, grain]
  );
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

  const isCumulative = viewMode === 'cumulative';
  // A summed goal is annual, so outside cumulative view it becomes a
  // per-period target (per week or per month). An averaged goal is
  // already comparable to a period average, in either view.
  const goalLine =
    goal == null ? null : isCumulative || statMode === 'average' ? goal : round(goal / periodsPerYear(grain));

  const values = series.map((p) => p.value);
  const allValues = goalLine != null ? [...values, goalLine] : values;
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
    const clamped = dateStr > today ? today : dateStr;
    if (daysElapsed <= 1) return PAD.left;
    return PAD.left + ((dayOfYear(clamped) - 1) / (daysElapsed - 1)) * innerWidth;
  }
  function yAt(value: number): number {
    return PAD.top + (1 - (value - minY) / spanY) * innerHeight;
  }

  // Where a point "sits" on the x axis: a cumulative line anchors each dot
  // to the start of its period, while a bar is centered across however
  // much of the period has actually elapsed (so an in-progress week or
  // month gets a narrower bar instead of overhanging past today).
  function centerX(p: PeriodPoint): number {
    return isCumulative ? xAt(p.start) : (xAt(p.start) + xAt(p.end)) / 2;
  }

  const linePath = isCumulative
    ? series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.start)} ${yAt(p.value)}`).join(' ')
    : '';
  const lastPoint = series[series.length - 1];
  const hovered = hoverIndex != null ? series[hoverIndex] : null;

  // The sloped pace line only makes sense against a cumulative total --
  // outside cumulative view the equivalent target is the flat goal line.
  const paceToday = isCumulative && goal != null ? goal * yearProgress(today) : null;
  const paceLinePath =
    paceToday != null ? `M ${xAt(`${referenceYear}-01-01`)} ${yAt(0)} L ${xAt(today)} ${yAt(paceToday)}` : null;

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (series.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    series.forEach((p, i) => {
      const dist = Math.abs(centerX(p) - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const periodLabel = grain === 'week' ? 'week' : 'month';

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
        <p className="settings-hint">
          {isCumulative
            ? `Cumulative ${statMode === 'average' ? 'average' : 'total'} by ${periodLabel}`
            : `${grain === 'week' ? 'Weekly' : 'Monthly'} ${statMode === 'average' ? 'average' : 'total'}`}
        </p>
        {isCumulative && goal != null && (
          <p className="settings-hint chart-pace-hint">Dotted line = pace to reach the goal by Dec 31</p>
        )}

        <div className="chart-controls">
          <div className="chart-mode-choice">
            <button type="button" className={`type-btn ${grain === 'week' ? 'active' : ''}`} onClick={() => setGrain('week')}>
              Week
            </button>
            <button
              type="button"
              className={`type-btn ${grain === 'month' ? 'active' : ''}`}
              onClick={() => setGrain('month')}
            >
              Month
            </button>
          </div>
          <div className="chart-mode-choice">
            <button
              type="button"
              className={`type-btn ${!isCumulative ? 'active' : ''}`}
              onClick={() => setViewMode('bar')}
            >
              Bar
            </button>
            <button
              type="button"
              className={`type-btn ${isCumulative ? 'active' : ''}`}
              onClick={() => setViewMode('cumulative')}
            >
              Cumulative
            </button>
          </div>
        </div>

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

              {goalLine != null && (
                <>
                  <line
                    x1={PAD.left}
                    y1={yAt(goalLine)}
                    x2={CHART_WIDTH - PAD.right}
                    y2={yAt(goalLine)}
                    className="chart-goal-line"
                  />
                  <text x={CHART_WIDTH - PAD.right} y={yAt(goalLine) - 4} className="chart-goal-label" textAnchor="end">
                    {isCumulative ? `Goal ${goalLine}` : `Goal/${grain === 'week' ? 'wk' : 'mo'} ${goalLine}`}
                  </text>
                </>
              )}

              {paceLinePath && <path d={paceLinePath} className="chart-pace-line" fill="none" />}

              {isCumulative ? (
                <>
                  <path d={linePath} className="chart-line" fill="none" />
                  {series.map((p, i) => (
                    <circle
                      key={p.start}
                      cx={xAt(p.start)}
                      cy={yAt(p.value)}
                      r={i === hoverIndex ? 4 : 2.5}
                      className="chart-dot"
                    />
                  ))}
                </>
              ) : (
                series.map((p, i) => {
                  const x0 = xAt(p.start);
                  const x1 = Math.max(xAt(p.end), x0 + 2);
                  const barPad = Math.min(1.5, (x1 - x0) / 4);
                  const top = Math.min(yAt(0), yAt(p.value));
                  const height = Math.max(Math.abs(yAt(0) - yAt(p.value)), 1);
                  return (
                    <rect
                      key={p.start}
                      x={x0 + barPad}
                      y={top}
                      width={Math.max(x1 - x0 - barPad * 2, 1)}
                      height={height}
                      rx={1.5}
                      className={`chart-bar ${i === hoverIndex ? 'chart-bar-hover' : ''}`}
                    />
                  );
                })
              )}

              {paceToday != null && (
                <circle cx={xAt(today)} cy={yAt(paceToday)} r={3.5} className="chart-pace-dot" />
              )}

              {isCumulative && hovered && hoverIndex != null && (
                <line
                  x1={centerX(hovered)}
                  y1={PAD.top}
                  x2={centerX(hovered)}
                  y2={CHART_HEIGHT - PAD.bottom}
                  className="chart-crosshair"
                />
              )}

              {lastPoint && (
                <text x={centerX(lastPoint)} y={yAt(lastPoint.value) - 8} className="chart-value-label" textAnchor="end">
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
                  {grain === 'week' ? 'Week of ' : ''}
                  {formatPeriodLabel(hovered.start, grain)}: <strong>{hovered.value}</strong>
                </>
              ) : (
                ' '
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
