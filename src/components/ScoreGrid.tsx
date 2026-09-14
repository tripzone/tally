import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Activity, DayScores, DaysMap } from '../types';
import { addDays, formatDisplayDateParts, todayStr } from '../dateUtils';
import { gridTemplateColumns } from '../gridLayout';

interface ScoreGridProps {
  activities: Activity[];
  days: DaysMap;
  dates: string[]; // ascending, oldest first, today last
  onTap: (dateStr: string, activity: Activity) => void;
  onTextChange: (dateStr: string, activity: Activity, value: string) => void;
  onLoadMore: () => void;
  onRequestAddActivity: () => void;
}

const SCROLL_THRESHOLD = 120;

export default function ScoreGrid({
  activities,
  days,
  dates,
  onTap,
  onTextChange,
  onLoadMore,
  onRequestAddActivity,
}: ScoreGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingAdjustRef = useRef<number | null>(null);
  const hasScrolledToBottomRef = useRef(false);
  const [editingCell, setEditingCell] = useState<{ dateStr: string; activityId: string } | null>(null);

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

  function commitText(dateStr: string, activity: Activity, value: string) {
    setEditingCell(null);
    onTextChange(dateStr, activity, value);
  }

  return (
    <div className="grid-wrap">
      <div className="grid-scroll" ref={scrollRef} onScroll={handleScroll}>
        <div className="grid" style={{ gridTemplateColumns: gridTemplateColumns(activities) }}>
          <div className="cell header-cell corner-cell">Day</div>
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`cell header-cell activity-header ${activity.kind === 'text' ? 'text' : activity.type}`}
            >
              <span className="activity-name">{activity.name}</span>
            </div>
          ))}
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
              editingCell={editingCell}
              onStartEdit={(activityId) => setEditingCell({ dateStr, activityId })}
              onCommitText={commitText}
              onCancelEdit={() => setEditingCell(null)}
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
  editingCell: { dateStr: string; activityId: string } | null;
  onStartEdit: (activityId: string) => void;
  onCommitText: (dateStr: string, activity: Activity, value: string) => void;
  onCancelEdit: () => void;
}

function Row({
  dateStr,
  activities,
  dayScores,
  onTap,
  editingCell,
  onStartEdit,
  onCommitText,
  onCancelEdit,
}: RowProps) {
  const today = todayStr();
  const isToday = dateStr === today;
  const isYesterday = dateStr === addDays(today, -1);
  const { primary, secondary } = formatDisplayDateParts(dateStr);

  return (
    <>
      <div
        className={`cell date-cell ${isToday ? 'is-today row-today' : ''} ${isYesterday ? 'row-yesterday' : ''}`}
      >
        <span className="date-primary">{primary}</span>
        <span className="date-secondary">{secondary}</span>
      </div>
      {activities.map((activity) => {
        if (activity.kind === 'text') {
          const raw = dayScores[activity.id];
          const value = typeof raw === 'string' ? raw : '';
          const isEditing = editingCell?.dateStr === dateStr && editingCell.activityId === activity.id;
          if (isEditing) {
            return (
              <TextCellInput
                key={activity.id}
                initialValue={value}
                onCommit={(next) => onCommitText(dateStr, activity, next)}
                onCancel={onCancelEdit}
              />
            );
          }
          return (
            <button
              key={activity.id}
              type="button"
              className={`cell score-cell text ${value ? 'has-value' : ''}`}
              onClick={() => onStartEdit(activity.id)}
              aria-label={`${activity.name} on ${dateStr}, current note ${value || '(none)'}`}
            >
              {value}
            </button>
          );
        }

        const raw = dayScores[activity.id];
        const value = typeof raw === 'number' ? raw : 0;
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
      <div className="cell filler-cell" />
    </>
  );
}

interface TextCellInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

function TextCellInput({ initialValue, onCommit, onCancel }: TextCellInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <input
      autoFocus
      className="cell text-cell-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}
