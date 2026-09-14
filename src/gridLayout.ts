import type { Activity } from './types';

// Date column, then one column per activity (minimum width, stretching to
// fill extra width on wider/desktop screens), then the add-column button.
// Text columns get twice the minimum and twice the flex share of numeric
// columns since they show free-text notes.
export function gridTemplateColumns(activities: Activity[]): string {
  const columns = activities.map((a) => (a.kind === 'text' ? 'minmax(88px, 2fr)' : 'minmax(44px, 1fr)'));
  return ['72px', ...columns, '44px'].join(' ');
}
