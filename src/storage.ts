import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Activity, DayScores, DaysMap } from './types';

// Firestore-backed persistence, scoped per signed-in user:
//   users/{uid}                 -> { activities: Activity[], totalGoal?: number | null }
//   users/{uid}/days/{dateStr}  -> DayScores (activityId -> score)
// Each day is its own document so a single tap only writes the day that changed.

function defaultActivities(): Activity[] {
  return [
    { id: crypto.randomUUID(), name: 'Gym', kind: 'number', type: 'positive' },
    { id: crypto.randomUUID(), name: 'Music', kind: 'number', type: 'positive' },
    { id: crypto.randomUUID(), name: 'Smoking', kind: 'number', type: 'negative' },
  ];
}

// Older documents used kind: 'numeric-total' | 'numeric-average' | 'text'.
// Normalize those into the current shape on read.
function normalizeActivity(raw: unknown): Activity {
  const a = raw as Record<string, unknown>;
  const rawKind = a.kind as string;
  if (rawKind === 'numeric-total' || rawKind === 'numeric-average') {
    return {
      id: a.id as string,
      name: a.name as string,
      kind: 'number',
      type: a.type as Activity['type'],
      statMode: rawKind === 'numeric-average' ? 'average' : 'sum',
      showInMetrics: true,
      contributeToTotal: rawKind === 'numeric-total',
    };
  }
  return a as unknown as Activity;
}

export async function loadUserData(uid: string): Promise<{ activities: Activity[]; totalGoal: number | null }> {
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.data();
  const rawActivities = data?.activities as unknown[] | undefined;
  const totalGoal = typeof data?.totalGoal === 'number' ? (data.totalGoal as number) : null;

  if (rawActivities && rawActivities.length > 0) {
    return { activities: rawActivities.map(normalizeActivity), totalGoal };
  }

  const defaults = defaultActivities();
  await saveActivities(uid, defaults);
  return { activities: defaults, totalGoal: null };
}

export function saveActivities(uid: string, activities: Activity[]): Promise<void> {
  return setDoc(doc(db, 'users', uid), { activities }, { merge: true });
}

export function saveTotalGoal(uid: string, totalGoal: number | null): Promise<void> {
  return setDoc(doc(db, 'users', uid), { totalGoal }, { merge: true });
}

export async function loadDays(uid: string): Promise<DaysMap> {
  const snap = await getDocs(collection(db, 'users', uid, 'days'));
  const days: DaysMap = {};
  snap.forEach((docSnap) => {
    days[docSnap.id] = docSnap.data() as DayScores;
  });
  return days;
}

export function saveDayScores(uid: string, dateStr: string, scores: DayScores): Promise<void> {
  return setDoc(doc(db, 'users', uid, 'days', dateStr), scores);
}
