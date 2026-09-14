import { useState, type FormEvent } from 'react';
import type { ActivityType } from '../types';

interface AddActivityModalProps {
  onCancel: () => void;
  onSubmit: (name: string, type: ActivityType) => void;
}

export default function AddActivityModal({ onCancel, onSubmit }: AddActivityModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ActivityType>('positive');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, type);
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
          <span>Type</span>
          <div className="type-choice">
            <button
              type="button"
              className={`type-btn positive ${type === 'positive' ? 'active' : ''}`}
              onClick={() => setType('positive')}
            >
              Building (+)
            </button>
            <button
              type="button"
              className={`type-btn negative ${type === 'negative' ? 'active' : ''}`}
              onClick={() => setType('negative')}
            >
              Kicking (−)
            </button>
          </div>
        </div>
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
