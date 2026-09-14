import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Activity } from '../types';

const ROW_HEIGHT = 52;

interface ColumnSettingsModalProps {
  activities: Activity[];
  onCancel: () => void;
  onReorder: (next: Activity[]) => void;
  onUpdate: (id: string, updates: Partial<Omit<Activity, 'id'>>) => void;
}

export default function ColumnSettingsModal({
  activities,
  onCancel,
  onReorder,
  onUpdate,
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
          <ActivityEditPanel activity={editingActivity} onBack={() => setEditingId(null)} onUpdate={onUpdate} />
        ) : (
          <>
            <h2>Columns</h2>
            <p className="settings-hint">Drag ≡ to reorder, tap ✎ to edit.</p>
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
}

function ColumnRow({ activity, isDragging, onPointerDown, onEdit }: ColumnRowProps) {
  const isText = activity.kind === 'text';
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
}

function ActivityEditPanel({ activity, onBack, onUpdate }: ActivityEditPanelProps) {
  const [name, setName] = useState(activity.name);
  const isText = activity.kind === 'text';

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

          <div className="field">
            <span>Metrics tile</span>
            <div className="type-choice">
              <button
                type="button"
                className={`type-btn ${activity.showInMetrics !== false ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { showInMetrics: true })}
              >
                Show
              </button>
              <button
                type="button"
                className={`type-btn ${activity.showInMetrics === false ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { showInMetrics: false })}
              >
                Hide
              </button>
            </div>
          </div>

          <div className="field">
            <span>Total</span>
            <div className="type-choice">
              <button
                type="button"
                className={`type-btn ${activity.contributeToTotal !== false ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { contributeToTotal: true })}
              >
                Included
              </button>
              <button
                type="button"
                className={`type-btn ${activity.contributeToTotal === false ? 'active' : ''}`}
                onClick={() => onUpdate(activity.id, { contributeToTotal: false })}
              >
                Excluded
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
