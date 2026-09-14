import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Activity, DayScores, DaysMap } from '../types';
import { formatDisplayDate } from '../dateUtils';
import { gridTemplateColumns } from '../gridLayout';

interface ScoreGridProps {
  activities: Activity[];
  days: DaysMap;
  dates: string[]; // ascending, oldest first, today last
  onTap: (dateStr: string, activity: Activity) => void;
  onLoadMore: () => void;
  onRequestAddActivity: () => void;
}

const SCROLL_THRESHOLD = 120;

export default function ScoreGrid({
  activities,
  days,
  dates,
  onTap,
  onLoadMore,
  onRequestAddActivity,
}: ScoreGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingAdjustRef = useRef<number | null>(null);
  const hasScrolledToBottomRef = useRef(false);

  // Land on today's row on first load.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && !hasScrolledToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      hasScrolledToBottomRef.current = true;
    }
  }, []);

  // Keep the viewport steady when older days get prepended above.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pendingAdjustRef.current !== null) {
      const newHeight = el.scrollHeight;
      el.scrollTop = newHeight - pendingAdjustRef.current + el.scrollTop;
      pendingAdjustRef.current = null;
    }
  }, [dates]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < SCROLL_THRESHOLD) {
      pendingAdjustRef.current = el.scrollHeight;
      onLoadMore();
    }
  }

  return (
    <div className="grid-wrap">
      <div className="grid-scroll" ref={scrollRef} onScroll={handleScroll}>
        <div
          className="grid"
          style={{ gridTemplateColumns: gridTemplateColumns(activities.length) }}
        >
          <div className="cell header-cell corner-cell">Day</div>
          {activities.map((activity) => (
            <div key={activity.id} className={`cell header-cell activity-header ${activity.type}`}>
              <span className="activity-name">{activity.name}</span>
            </div>
          ))}
          <div className="cell header-cell total-header">Total</div>
          <button
            type="button"
            className="cell header-cell add-activity-btn"
            onClick={onRequestAddActivity}
            aria-label="Add activity"
          >
            +
          </button>

          {dates.map((dateStr) => (
            <Row
              key={dateStr}
              dateStr={dateStr}
              activities={activities}
              dayScores={days[dateStr] ?? {}}
              onTap={onTap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  dateStr: string;
  activities: Activity[];
  dayScores: DayScores;
  onTap: (dateStr: string, activity: Activity) => void;
}

function Row({ dateStr, activities, dayScores, onTap }: RowProps) {
  const total = activities.reduce((sum, a) => sum + (dayScores[a.id] ?? 0), 0);
  const isToday = dateStr === new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className={`cell date-cell ${isToday ? 'is-today' : ''}`}>{formatDisplayDate(dateStr)}</div>
      {activities.map((activity) => {
        const value = dayScores[activity.id] ?? 0;
        return (
          <button
            key={activity.id}
            type="button"
            className={`cell score-cell ${activity.type} ${value !== 0 ? 'has-value' : ''}`}
            onClick={() => onTap(dateStr, activity)}
            aria-label={`${activity.name} on ${dateStr}, current value ${value}`}
          >
            {value !== 0 ? value.toFixed(1) : ''}
          </button>
        );
      })}
      <div className={`cell total-cell ${total > 0 ? 'positive' : total < 0 ? 'negative' : ''}`}>
        {total !== 0 ? total.toFixed(1) : ''}
      </div>
      <div className="cell filler-cell" />
    </>
  );
}
