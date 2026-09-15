import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Activity } from '../types';

const ROW_HEIGHT = 52;
// Shared "shown in metrics" glyph -- reused on the column row, the edit
// panel, and (via the same className convention) the metric cards, so the
// same symbol always means the same thing across the app.
const METRICS_ICON = '▥';

interface ColumnSettingsModalProps {
  activities: Activity[];
  onCancel: () => void;
  onReorder: (next: Activity[]) => void;
  onUpdate: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
  onDelete: (id: string) => void;
}

export default function ColumnSettingsModal({
  activities,
  onCancel,
  onReorder,
  onUpdate,
  onDelete,
}: ColumnSettingsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => activities.map((a) => a.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragInfo = useRef<{ id: string; startY: number } | null>(null);
  const orderRef = useRef(order);
  const byId = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (!draggingId) setOrder(activities.map((a) => a.id));
  }, [activities, draggingId]);

  useEffect(() => {
    if (!draggingId) return;

    function handleMove(e: PointerEvent) {
      const info = dragInfo.current;
      if (!info) return;
      const deltaY = e.clientY - info.startY;
      const steps = Math.round(deltaY / ROW_HEIGHT);
      if (steps === 0) return;
      setOrder((prev) => {
        const curIndex = prev.indexOf(info.id);
        const newIndex = Math.min(Math.max(curIndex + steps, 0), prev.length - 1);
        if (newIndex === curIndex) return prev;
        const next = [...prev];
        next.splice(curIndex, 1);
        next.splice(newIndex, 0, info.id);
        return next;
      });
      info.startY = e.clientY;
    }

    function handleUp() {
      dragInfo.current = null;
      setDraggingId(null);
      const finalActivities = orderRef.current.map((id) => byId.get(id)).filter((a): a is Activity => !!a);
      onReorder(finalActivities);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingId, byId, onReorder]);

  function handlePointerDown(e: ReactPointerEvent, id: string) {
    e.preventDefault();
    dragInfo.current = { id, startY: e.clientY };
    setDraggingId(id);
  }

  const editingActivity = editingId ? byId.get(editingId) : undefined;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        {editingActivity ? (
          <ActivityEditPanel
            activity={editingActivity}
            onBack={() => setEditingId(null)}
            onUpdate={onUpdate}
            onDelete={(id) => {
              onDelete(id);
              setEditingId(null);
            }}
          />
        ) : (
          <>
            <h2 />
            <p className="settings-hint">
              Drag ≡ to reorder · {METRICS_ICON} = shown in metrics · Σ = counts toward total · ✎ to edit
            </p>
            <div className="settings-list">
              {order.map((id) => {
                const activity = byId.get(id);
                if (!activity) return null;
                return (
                  <ColumnRow
                    key={id}
                    activity={activity}
                    isDragging={draggingId === id}
                    onPointerDown={handlePointerDown}
                    onEdit={setEditingId}
                    onUpdate={onUpdate}
                  />
                );
              })}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onCancel}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface ColumnRowProps {
  activity: Activity;
  isDragging: boolean;
  onPointerDown: (e: ReactPointerEvent, id: string) => void;
  onEdit: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
}

function ColumnRow({ activity, isDragging, onPointerDown, onEdit, onUpdate }: ColumnRowProps) {
  const isText = activity.kind === 'text';
  const shown = activity.showInMetrics !== false;
  const inTotal = activity.contributeToTotal !== false;
  return (
    <div className={`settings-list-row ${isDragging ? 'dragging' : ''}`}>
      <button
        type="button"
        className="drag-handle"
        onPointerDown={(e) => onPointerDown(e, activity.id)}
        aria-label={`Reorder ${activity.name}`}
      >
        ≡
      </button>
      <span className="settings-list-name">{activity.name}</span>
      {!isText && (
        <>
          <button
            type="button"
            className={`mini-toggle ${shown ? 'on' : 'off'}`}
            onClick={() => onUpdate(activity.id, { showInMetrics: !shown })}
            aria-label={shown ? `Hide ${activity.name} from metrics` : `Show ${activity.name} in metrics`}
            title={shown ? 'Shown in metrics' : 'Hidden from metrics'}
          >
            {METRICS_ICON}
          </button>
          <button
            type="button"
            className={`mini-toggle ${inTotal ? 'on' : 'off'}`}
            onClick={() => onUpdate(activity.id, { contributeToTotal: !inTotal })}
            aria-label={inTotal ? `Exclude ${activity.name} from total` : `Include ${activity.name} in total`}
            title={inTotal ? 'Counts toward total' : 'Excluded from total'}
          >
            Σ
          </button>
        </>
      )}
      <span className="settings-list-kind">{isText ? 'Text' : activity.type === 'negative' ? '−' : '+'}</span>
      <button
        type="button"
        className="edit-btn"
        onClick={() => onEdit(activity.id)}
        aria-label={`Edit ${activity.name}`}
      >
        ✎
      </button>
    </div>
  );
}

interface ActivityEditPanelProps {
  activity: Activity;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
  onDelete: (id: string) => void;
}

function ActivityEditPanel({ activity, onBack, onUpdate, onDelete }: ActivityEditPanelProps) {
  const [name, setName] = useState(activity.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isText = activity.kind === 'text';
  const shown = activity.showInMetrics !== false;
  const inTotal = activity.contributeToTotal !== false;

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== activity.name) {
      onUpdate(activity.id, { name: trimmed });
    } else {
      setName(activity.name);
    }
  }

  return (
    <div className="edit-panel">
      <div className="edit-panel-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="Back to columns">
          ‹ Back
        </button>
      </div>

      <div className="field">
        <span>Name</span>
        <input className="settings-name-input" value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
      </div>

      <div className="field">
        <span>Type</span>
        <div className="type-choice">
          <button
            type="button"
            className={`type-btn ${!isText ? 'active' : ''}`}
            onClick={() =>
              onUpdate(activity.id, {
                kind: 'number',
                type: 'positive',
                statMode: 'sum',
                showInMetrics: true,
                contributeToTotal: true,
              })
            }
          >
            Number
          </button>
          <button
            type="button"
            className={`type-btn ${isText ? 'active' : ''}`}
            onClick={() => onUpdate(activity.id, { kind: 'text' })}
          >
            Text
          </button>
        </div>
      </div>

      {!isText && (
        <>
          <div className="field">
            <span>Included in</span>
            <div className="type-choice">
              <button
                type="button"
                className={`type-btn positive ${shown ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { showInMetrics: !shown })}
              >
                {METRICS_ICON} Metrics
              </button>
              <button
                type="button"
                className={`type-btn positive ${inTotal ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { contributeToTotal: !inTotal })}
              >
                Σ Total
              </button>
            </div>
          </div>

          <div className="field">
            <span>Direction</span>
            <div className="type-choice">
              <button
                type="button"
                className={`type-btn positive ${activity.type === 'positive' ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { type: 'positive' })}
              >
                Positive (+)
              </button>
              <button
                type="button"
                className={`type-btn negative ${activity.type === 'negative' ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { type: 'negative' })}
              >
                Negative (−)
              </button>
            </div>
          </div>

          <div className="field">
            <span>Stats</span>
            <div className="type-choice">
              <button
                type="button"
                className={`type-btn ${activity.statMode !== 'average' ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { statMode: 'sum' })}
              >
                Totalled
              </button>
              <button
                type="button"
                className={`type-btn ${activity.statMode === 'average' ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { statMode: 'average' })}
              >
                Averaged
              </button>
            </div>
          </div>
        </>
      )}

      <div className="danger-zone">
        {confirmingDelete ? (
          <>
            <p className="delete-confirm-text">Delete "{activity.name}"? This can't be undone.</p>
            <div className="type-choice">
              <button type="button" className="type-btn" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button type="button" className="type-btn negative active" onClick={() => onDelete(activity.id)}>
                Delete
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="delete-column-btn" onClick={() => setConfirmingDelete(true)}>
            Delete column
          </button>
        )}
      </div>
    </div>
  );
}
