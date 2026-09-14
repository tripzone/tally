// Date column, then one column per activity (44px minimum, but stretches to
// fill extra width on wider/desktop screens), then the add-column button.
export function gridTemplateColumns(activityCount: number): string {
  return `72px repeat(${activityCount}, minmax(44px, 1fr)) 44px`;
}
