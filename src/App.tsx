import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { Activity, ActivityType, DaysMap, TapMode } from './types';
import { loadActivities, saveActivities, loadDays, saveDayScores } from './storage';
import { addDays, dateRange, todayStr } from './dateUtils';
import ScoreGrid from './components/ScoreGrid';
import ModeToggle from './components/ModeToggle';
import AddActivityModal from './components/AddActivityModal';
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
      const current = dayScores[activity.id] ?? 0;
      const next = applyTap(activity.type, mode, current);
      const nextDayScores = { ...dayScores, [activity.id]: next };
      saveDayScores(uid, dateStr, nextDayScores).catch((err) => console.error('Failed to save score', err));
      return { ...prev, [dateStr]: nextDayScores };
    });
  }

  function handleAddActivity(name: string, type: ActivityType) {
    const activity: Activity = { id: crypto.randomUUID(), name, type };
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
          onLoadMore={handleLoadMore}
          onRequestAddActivity={() => setShowAddForm(true)}
        />
        <StatsPanel activities={activities} days={days} />
      </div>

      {showAddForm && (
        <AddActivityModal onCancel={() => setShowAddForm(false)} onSubmit={handleAddActivity} />
      )}
    </div>
  );
}
