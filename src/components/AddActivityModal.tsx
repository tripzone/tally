import { useState, type FormEvent } from 'react';
import type { Activity, ActivityType } from '../types';

interface AddActivityModalProps {
  onCancel: () => void;
  onSubmit: (input: Omit<Activity, 'id'>) => void;
}

export default function AddActivityModal({ onCancel, onSubmit }: AddActivityModalProps) {
  const [name, setName] = useState('');
  const [isText, setIsText] = useState(false);
  const [type, setType] = useState<ActivityType>('positive');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isText) {
      onSubmit({ name: trimmed, kind: 'text' });
    } else {
      onSubmit({ name: trimmed, kind: 'number', type });
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>New activity</h2>
        <label className="field">
          <span>Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Gym, Reading, Smoking"
          />
        </label>
        <div className="field">
          <span>Column type</span>
          <div className="type-choice">
            <button
              type="button"
              className={`type-btn ${!isText ? 'active' : ''}`}
              onClick={() => setIsText(false)}
            >
              Number
            </button>
            <button type="button" className={`type-btn ${isText ? 'active' : ''}`} onClick={() => setIsText(true)}>
              Text
            </button>
          </div>
        </div>
        {!isText && (
          <div className="field">
            <span>Direction</span>
            <div className="type-choice">
              <button
                type="button"
                className={`type-btn positive ${type === 'positive' ? 'active' : ''}`}
                onClick={() => setType('positive')}
              >
                Positive (+)
              </button>
              <button
                type="button"
                className={`type-btn negative ${type === 'negative' ? 'active' : ''}`}
                onClick={() => setType('negative')}
              >
                Negative (−)
              </button>
            </div>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
