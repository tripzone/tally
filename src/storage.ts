import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Activity, DayScores, DaysMap } from './types';

// Firestore-backed persistence, scoped per signed-in user:
//   users/{uid}                 -> { activities: Activity[] }
//   users/{uid}/days/{dateStr}  -> DayScores (activityId -> score)
// Each day is its own document so a single tap only writes the day that changed.

function defaultActivities(): Activity[] {
  return [
    { id: crypto.randomUUID(), name: 'Gym', kind: 'numeric-total', type: 'positive' },
    { id: crypto.randomUUID(), name: 'Music', kind: 'numeric-total', type: 'positive' },
    { id: crypto.randomUUID(), name: 'Smoking', kind: 'numeric-total', type: 'negative' },
  ];
}

export async function loadActivities(uid: string): Promise<Activity[]> {
  const snap = await getDoc(doc(db, 'users', uid));
  const activities = snap.data()?.activities as Activity[] | undefined;
  if (activities && activities.length > 0) return activities;

  const defaults = defaultActivities();
  await saveActivities(uid, defaults);
  return defaults;
}

export function saveActivities(uid: string, activities: Activity[]): Promise<void> {
  return setDoc(doc(db, 'users', uid), { activities }, { merge: true });
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
