import type { TapMode } from '../types';

interface ModeToggleProps {
  mode: TapMode;
  onChange: (mode: TapMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle" role="group" aria-label="Tap mode">
      <button
        type="button"
        className={`mode-btn add ${mode === 'add' ? 'active' : ''}`}
        onClick={() => onChange('add')}
      >
        + Add
      </button>
      <button
        type="button"
        className={`mode-btn remove ${mode === 'remove' ? 'active' : ''}`}
        onClick={() => onChange('remove')}
      >
        − Remove
      </button>
    </div>
  );
}
