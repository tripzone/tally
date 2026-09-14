// Shared column layout so the totals footer lines up exactly with the
// score grid's columns above it.
export function gridTemplateColumns(activityCount: number): string {
  return `72px repeat(${activityCount}, minmax(64px, 1fr)) 56px 44px`;
}
