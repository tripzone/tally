import { useState } from 'react';
import type { Activity, ActivityType } from '../types';

interface ColumnSettingsModalProps {
  activities: Activity[];
  onCancel: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onUpdate: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
}

export default function ColumnSettingsModal({ activities, onCancel, onMove, onUpdate }: ColumnSettingsModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form
        className="modal settings-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => e.preventDefault()}
      >
        <h2>Columns</h2>
        <div className="settings-list">
          {activities.map((activity, index) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              isFirst={index === 0}
              isLast={index === activities.length - 1}
              onMove={onMove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onCancel}>
            Done
          </button>
        </div>
      </form>
    </div>
  );
}

interface ActivityRowProps {
  activity: Activity;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onUpdate: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
}

function ActivityRow({ activity, isFirst, isLast, onMove, onUpdate }: ActivityRowProps) {
  const [name, setName] = useState(activity.name);
  const isText = activity.kind === 'text';
  const isAveraged = activity.kind === 'numeric-average';

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== activity.name) {
      onUpdate(activity.id, { name: trimmed });
    } else {
      setName(activity.name);
    }
  }

  function setDirection(type: ActivityType) {
    onUpdate(activity.id, { type });
  }

  return (
    <div className="settings-row">
      <div className="settings-row-top">
        <div className="reorder-btns">
          <button
            type="button"
            className="reorder-btn"
            disabled={isFirst}
            onClick={() => onMove(activity.id, 'up')}
            aria-label={`Move ${activity.name} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className="reorder-btn"
            disabled={isLast}
            onClick={() => onMove(activity.id, 'down')}
            aria-label={`Move ${activity.name} down`}
          >
            ↓
          </button>
        </div>
        <input
          className="settings-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
        />
      </div>

      <div className="type-choice settings-pills">
        <button
          type="button"
          className={`type-btn ${!isText ? 'active' : ''}`}
          onClick={() => onUpdate(activity.id, { kind: 'numeric-total', type: activity.type ?? 'positive' })}
        >
          Number
        </button>
        <button
          type="button"
          className={`type-btn ${isText ? 'active' : ''}`}
          onClick={() => onUpdate(activity.id, { kind: 'text', type: undefined })}
        >
          Text
        </button>
      </div>

      {!isText && (
        <>
          <div className="type-choice settings-pills">
            <button
              type="button"
              className={`type-btn positive ${activity.type === 'positive' ? 'active' : ''}`}
              onClick={() => setDirection('positive')}
            >
              Positive (+)
            </button>
            <button
              type="button"
              className={`type-btn negative ${activity.type === 'negative' ? 'active' : ''}`}
              onClick={() => setDirection('negative')}
            >
              Negative (−)
            </button>
          </div>
          <div className="type-choice settings-pills">
            <button
              type="button"
              className={`type-btn ${!isAveraged ? 'active' : ''}`}
              onClick={() => onUpdate(activity.id, { kind: 'numeric-total' })}
            >
              Totalled
            </button>
            <button
              type="button"
              className={`type-btn ${isAveraged ? 'active' : ''}`}
              onClick={() => onUpdate(activity.id, { kind: 'numeric-average' })}
            >
              Averaged
            </button>
          </div>
        </>
      )}
    </div>
  );
}
