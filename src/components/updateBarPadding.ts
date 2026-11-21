/** Space between the bar and the safe-area inset (Art Director look note). */
export const UPDATE_BAR_OFFSET_PX = 12;

/** Downward hard-shadow on the bar (`hardShadow(3, 4)`). */
export const UPDATE_BAR_SHADOW_PX = 4;

/** Gap between the last scrolled element and the top of the bar's shadow. */
export const UPDATE_BAR_GAP_PX = 12;

/** Scroll-container bottom padding that leaves 12 px above the bar's 4 px shadow. */
export function updateBarScrollPadding(barHeightPx: number): string {
  return `calc(${barHeightPx + UPDATE_BAR_OFFSET_PX + UPDATE_BAR_SHADOW_PX + UPDATE_BAR_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;
}
