import { useState } from 'react';
import type { Activity } from '../types';

interface GoalsModalProps {
  activities: Activity[];
  totalGoal: number | null;
  onCancel: () => void;
  onUpdateActivity: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
  onUpdateTotalGoal: (goal: number | null) => void;
}

export default function GoalsModal({
  activities,
  totalGoal,
  onCancel,
  onUpdateActivity,
  onUpdateTotalGoal,
}: GoalsModalProps) {
  const numericActivities = activities.filter((a) => a.kind === 'number');

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal goals-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Goals</h2>
        <p className="settings-hint">Set an annual goal for any metric, or for the total.</p>
        <div className="goals-list">
          {numericActivities.map((activity) => (
            <GoalRow
              key={activity.id}
              label={activity.name}
              value={activity.goal ?? null}
              onCommit={(goal) => onUpdateActivity(activity.id, { goal })}
            />
          ))}
          <GoalRow label="Total" value={totalGoal} onCommit={onUpdateTotalGoal} emphasized />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onCancel}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface GoalRowProps {
  label: string;
  value: number | null;
  onCommit: (goal: number | null) => void;
  emphasized?: boolean;
}

function GoalRow({ label, value, onCommit, emphasized }: GoalRowProps) {
  const [input, setInput] = useState(value != null ? String(value) : '');

  function commit() {
    const trimmed = input.trim();
    if (trimmed === '') {
      if (value != null) onCommit(null);
      return;
    }
    const num = Number(trimmed);
    if (!Number.isNaN(num) && num !== value) onCommit(num);
  }

  return (
    <div className={`goal-row ${emphasized ? 'goal-row-total' : ''}`}>
      <span className="goal-row-label">{label}</span>
      <input
        className="settings-name-input goal-input"
        inputMode="decimal"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={commit}
        placeholder="No goal"
      />
    </div>
  );
}
