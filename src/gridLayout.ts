// Date column, then one narrow fixed-width column per activity (uniform --
// vertical headers mean text length no longer dictates width), then the
// add-column button. No Total column (removed).
export function gridTemplateColumns(activityCount: number): string {
  return `72px repeat(${activityCount}, 44px) 44px`;
}
