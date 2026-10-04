import type { DobbleCard } from './emojiMatchDeck';

interface DobbleCardViewProps {
  card: DobbleCard | null;
  testId: string;
  /** Tailwind size classes for the round card. */
  sizeClass: string;
  /** Tailwind text size for the emojis (see CARD_EMOJI_SIZE). */
  emojiClass: string;
  matchedEmoji: string | null;
  shake: boolean;
  /** Dimmed and untappable, e.g. a player's card frozen after a wrong tap. */
  frozen?: boolean;
  /** Not tappable but shown normally (the shared middle card in a duel). */
  readOnly?: boolean;
  onTap: (emoji: string) => void;
}

/** One round Emoji Match card with its emojis scattered and rotated. */
export function DobbleCardView({ card, testId, sizeClass, emojiClass, matchedEmoji, shake, frozen = false, readOnly = false, onTap }: DobbleCardViewProps) {
  return (
    <div
      data-testid={testId}
      data-frozen={frozen ? 'true' : 'false'}
      style={{ containerType: 'size' }}
      className={`${sizeClass} rounded-full bg-white border-4 border-slate-300 shadow-md relative overflow-hidden flex items-center justify-center transition-opacity duration-200 ${
        shake ? 'animate-shake' : 'animate-card-in'
      } ${frozen ? 'opacity-50' : ''}`}
    >
      {card?.emojis.map((item, idx) => (
        <button
          key={idx}
          type="button"
          disabled={frozen || readOnly}
          onClick={() => onTap(item.emoji)}
          style={{
            position: 'absolute',
            left: `calc(50% + ${item.x}%)`,
            top: `calc(50% + ${item.y}%)`,
            transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
            transition: 'transform 0.15s ease-out',
          }}
          className={`hover:scale-125 active:scale-95 select-none outline-none cursor-pointer transition-all duration-75 text-center leading-none ${emojiClass} ${
            matchedEmoji === item.emoji ? 'animate-emoji-pop scale-150 z-30 relative' : ''
          }`}
        >
          <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] block">{item.emoji}</span>
        </button>
      ))}
    </div>
  );
}

export default DobbleCardView;
