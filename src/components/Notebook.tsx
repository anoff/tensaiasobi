import type { ReactNode } from 'react';
import { OPERATION_CLASSES, operationOf } from '../utils/operatorColors';

/** Rule spacing of the notebook page, in px. Choice rows span two rules. */
const RULE = 40;

interface NotebookSheetProps {
  children: ReactNode;
  className?: string;
  testId?: string;
  dataAttrs?: Record<string, string>;
}

/**
 * Cream, ruled notebook page for school-style games (math, first sound).
 * Physical/toy games keep their own stages — this is only the answer sheet.
 */
export function NotebookSheet({ children, className = '', testId, dataAttrs }: NotebookSheetProps) {
  return (
    <div
      data-testid={testId}
      {...dataAttrs}
      className={`relative w-full rounded-[2rem] bg-paper border-2 border-paper-edge shadow-[0_6px_0_0_#EADFC4] text-ink ${className}`}
      style={{
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${RULE - 1}px, #D3E3F1 ${RULE - 1}px, #D3E3F1 ${RULE}px)`,
        backgroundPosition: `0 ${RULE / 2}px`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Small circle that holds the operator between the numerals, coloured by
 * operation (green +, red −) via the shared operator palette.
 */
export function NotebookOperator({ op }: { op: string }) {
  const operation = operationOf(op);
  return (
    <span
      data-operation={operation}
      className={`inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border-2 text-3xl md:text-4xl font-black leading-none ${OPERATION_CLASSES[operation]}`}
    >
      {operation === 'minus' ? '−' : '+'}
    </span>
  );
}

export type NotebookChoiceState = 'idle' | 'correct' | 'wrong';

interface NotebookChoiceProps {
  children: ReactNode;
  state: NotebookChoiceState;
  disabled: boolean;
  onClick: () => void;
  testId?: string;
  dataAttrs?: Record<string, string>;
  /** Optional non-text helper on the right of the line, e.g. a still dot tally. */
  aside?: ReactNode;
}

/**
 * One answer line on the notebook sheet: hollow circle on the left, big
 * numeral/letter next to it. Correct = soft green wash + tick, wrong = shake
 * (the caller clears the state so the child can try again).
 */
export function NotebookChoice({ children, state, disabled, onClick, testId, dataAttrs, aside }: NotebookChoiceProps) {
  const rowClass =
    state === 'correct'
      ? 'bg-emerald-100/90 border-emerald-300'
      : state === 'wrong'
        ? 'bg-rose-50/80 border-rose-200 animate-shake'
        : 'bg-white/40 border-transparent hover:bg-white/80 active:bg-sky-100/70';

  return (
    <button
      type="button"
      data-testid={testId}
      {...dataAttrs}
      disabled={disabled}
      onClick={onClick}
      className={`w-full min-h-[72px] flex items-center gap-5 px-5 rounded-2xl border-2 transition-colors duration-150 outline-none cursor-pointer select-none touch-manipulation focus-visible:ring-4 focus-visible:ring-sky-300 ${rowClass}`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 w-10 h-10 rounded-full border-4 flex items-center justify-center text-xl font-black leading-none transition-colors duration-150 ${
          state === 'correct' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink/35 bg-transparent'
        }`}
      >
        {state === 'correct' ? '✓' : null}
      </span>
      <span className="flex-1 text-left text-5xl font-black tabular-nums leading-none text-ink">{children}</span>
      {aside && <span aria-hidden="true" className="shrink-0">{aside}</span>}
    </button>
  );
}

/** Still dot tally in groups of five, so pre-readers can match a quantity without the numeral. */
export function NotebookTally({ count }: { count: number }) {
  const groups = Array.from({ length: Math.ceil(count / 5) }, (_, g) => Math.min(5, count - g * 5));
  return (
    <span data-testid="notebook-tally" className="flex flex-col gap-1 animate-pop-in">
      {groups.map((size, g) => (
        <span key={g} className="flex gap-1">
          {Array.from({ length: size }, (_, i) => (
            <span key={i} className="w-3 h-3 rounded-full bg-ink/60" />
          ))}
        </span>
      ))}
    </span>
  );
}
