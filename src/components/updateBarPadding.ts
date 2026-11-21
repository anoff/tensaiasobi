/** Space between the bar and the safe-area inset (Art Director look note). */
export const UPDATE_BAR_OFFSET_PX = 12;

/** Launcher bottom padding that lets the last tiles scroll clear of the fixed bar. */
export function updateBarLauncherPadding(barHeightPx: number): string {
  return `calc(${barHeightPx + UPDATE_BAR_OFFSET_PX}px + env(safe-area-inset-bottom, 0px))`;
}
