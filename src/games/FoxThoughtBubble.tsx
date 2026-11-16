const INK = '#2a1c14';
const CREAM = '#fff8ec';

/**
 * Official thought-bubble art, inlined so `#cloud` can bob and the dots can
 * be drawn in code. Source: `src/assets/characters/svg/thought_bubble.svg`.
 */
export default function FoxThoughtBubble() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 120"
      width="100%"
      height="100%"
      overflow="visible"
      aria-hidden
      data-testid="chess-thought-bubble"
    >
      <g id="trail">
        <circle cx="113" cy="83" r="9" fill={CREAM} stroke={INK} strokeWidth="6.85" />
        <circle cx="130" cy="97" r="6.5" fill={CREAM} stroke={INK} strokeWidth="6.85" />
        <circle cx="144" cy="107" r="4.5" fill={CREAM} stroke={INK} strokeWidth="6.85" />
      </g>
      <g id="cloud" className="chess-thought-cloud">
        <path
          d="M75.47 18.30 A19.41 19.41 0 0 1 105.50 27.14 A13.17 13.17 0 0 1 117.98 44.34 A12.79 12.79 0 0 1 107.08 61.84 A19.06 19.06 0 0 1 77.89 71.47 A21.04 21.04 0 0 1 44.07 68.71 A16.45 16.45 0 0 1 21.45 54.85 A11.46 11.46 0 0 1 20.61 36.39 A15.97 15.97 0 0 1 41.95 21.96 A20.91 20.91 0 0 1 75.47 18.30 Z"
          fill={CREAM}
          stroke={INK}
          strokeWidth="8.57"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle className="chess-thought-dot-1" cx="54" cy="45" r="5" fill={INK} />
        <circle className="chess-thought-dot-2" cx="70" cy="45" r="5" fill={INK} />
        <circle className="chess-thought-dot-3" cx="86" cy="45" r="5" fill={INK} />
      </g>
    </svg>
  );
}
