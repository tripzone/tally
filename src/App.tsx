import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { Activity, ActivityType, DayScores, DaysMap, TapMode } from './types';
import { loadActivities, saveActivities, loadDays, saveDayScores } from './storage';
import { addDays, dateRange, todayStr } from './dateUtils';
import ScoreGrid from './components/ScoreGrid';
import ModeToggle from './components/ModeToggle';
import AddActivityModal from './components/AddActivityModal';
import ColumnSettingsModal from './components/ColumnSettingsModal';
import StatsPanel from './components/StatsPanel';
import SignIn from './components/SignIn';
import { useAuth } from './hooks/useAuth';

const INITIAL_DAYS_BACK = 60;
const LOAD_MORE_DAYS = 30;
const STEP = 0.5;

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function applyTap(type: ActivityType, mode: TapMode, current: number): number {
  if (mode === 'add') {
    return type === 'positive' ? round(current + STEP) : round(current - STEP);
  }
  // remove: undo a tap for this activity, moving its score back toward zero
  return type === 'positive' ? round(Math.max(0, current - STEP)) : round(Math.min(0, current + STEP));
}

export default function App() {
  const { user, loading: authLoading, signInWithGoogle, signOutUser } = useAuth();

  if (authLoading) {
    return (
      <div className="splash">
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <SignIn onSignIn={signInWithGoogle} />;
  }

  return <Board uid={user.uid} displayName={user.displayName} onSignOut={signOutUser} />;
}

interface BoardProps {
  uid: string;
  displayName: string | null;
  onSignOut: () => void;
}

function Board({ uid, displayName, onSignOut }: BoardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [days, setDays] = useState<DaysMap>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [mode, setMode] = useState<TapMode>('add');
  const [oldestDate, setOldestDate] = useState(() => addDays(todayStr(), -INITIAL_DAYS_BACK));
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    Promise.all([loadActivities(uid), loadDays(uid)]).then(([loadedActivities, loadedDays]) => {
      if (cancelled) return;
      setActivities(loadedActivities);
      setDays(loadedDays);
      setDataLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const dates = useMemo(() => dateRange(oldestDate, todayStr()), [oldestDate]);

  function handleTap(dateStr: string, activity: Activity) {
    setDays((prev) => {
      const dayScores = prev[dateStr] ?? {};
      const raw = dayScores[activity.id];
      const current = typeof raw === 'number' ? raw : 0;
      const next = applyTap(activity.type ?? 'positive', mode, current);
      const nextDayScores: DayScores = { ...dayScores, [activity.id]: next };
      saveDayScores(uid, dateStr, nextDayScores).catch((err) => console.error('Failed to save score', err));
      return { ...prev, [dateStr]: nextDayScores };
    });
  }

  function handleTextChange(dateStr: string, activity: Activity, value: string) {
    setDays((prev) => {
      const dayScores: DayScores = { ...(prev[dateStr] ?? {}) };
      const trimmed = value.trim();
      if (trimmed === '') {
        delete dayScores[activity.id];
      } else {
        dayScores[activity.id] = trimmed;
      }
      saveDayScores(uid, dateStr, dayScores).catch((err) => console.error('Failed to save note', err));
      return { ...prev, [dateStr]: dayScores };
    });
  }

  function handleAddActivity(input: Omit<Activity, 'id'>) {
    const activity: Activity = { id: crypto.randomUUID(), ...input };
    setActivities((prev) => {
      const next = [...prev, activity];
      saveActivities(uid, next).catch((err) => console.error('Failed to save activity', err));
      return next;
    });
    setShowAddForm(false);
  }

  function handleLoadMore() {
    setOldestDate((prev) => addDays(prev, -LOAD_MORE_DAYS));
  }

  function handleMoveActivity(id: string, direction: 'up' | 'down') {
    setActivities((prev) => {
      const index = prev.findIndex((a) => a.id === id);
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      saveActivities(uid, next).catch((err) => console.error('Failed to save activity order', err));
      return next;
    });
  }

  function handleUpdateActivity(id: string, updates: Partial<Omit<Activity, 'id'>>) {
    setActivities((prev) => {
      const next = prev.map((a) => {
        if (a.id !== id) return a;
        const merged: Activity = { ...a, ...updates };
        // Firestore rejects `undefined` field values -- drop `type` entirely
        // rather than writing it as undefined when switching to a text column.
        if (merged.kind === 'text') delete merged.type;
        return merged;
      });
      saveActivities(uid, next).catch((err) => console.error('Failed to save activity', err));
      return next;
    });
  }

  if (dataLoading) {
    return (
      <div className="splash">
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tally</h1>
        <div className="header-actions">
          <ModeToggle mode={mode} onChange={setMode} />
          <button
            type="button"
            className="gear-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Column settings"
          >
            ⚙
          </button>
          <button type="button" className="sign-out-btn" onClick={onSignOut} title={displayName ?? undefined}>
            Sign out
          </button>
        </div>
      </header>

      <div className="main-content">
        <ScoreGrid
          activities={activities}
          days={days}
          dates={dates}
          onTap={handleTap}
          onTextChange={handleTextChange}
          onLoadMore={handleLoadMore}
          onRequestAddActivity={() => setShowAddForm(true)}
        />
        <StatsPanel activities={activities} days={days} />
      </div>

      {showSettings && (
        <ColumnSettingsModal
          activities={activities}
          onCancel={() => setShowSettings(false)}
          onMove={handleMoveActivity}
          onUpdate={handleUpdateActivity}
        />
      )}

      {showAddForm && (
        <AddActivityModal onCancel={() => setShowAddForm(false)} onSubmit={handleAddActivity} />
      )}
    </div>
  );
}
