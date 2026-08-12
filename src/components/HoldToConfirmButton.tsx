import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface HoldToConfirmButtonProps {
  /** Called once the hold gesture has been sustained for the full `duration`. */
  onConfirm: () => void;
  /** How long (ms) the button must be held down before `onConfirm` fires. Defaults to 1000ms. */
  duration?: number;
  disabled?: boolean;
  className?: string;
  /** Extra classes applied to the progress fill layer. */
  progressClassName?: string;
  'data-testid'?: string;
  'aria-label'?: string;
  /** Render prop so callers can swap labels/icons based on hold progress (0-100). */
  children: (progress: number) => ReactNode;
}

/**
 * A press-and-hold button used for gestures that should not trigger on a simple tap,
 * e.g. "tap and hold to redeem/delete". Shows a filling progress bar while held and
 * calls `onConfirm` once the hold has been sustained for `duration` ms.
 */
export function HoldToConfirmButton({
  onConfirm,
  duration = 1000,
  disabled = false,
  className = '',
  progressClassName = 'bg-red-500/20 dark:bg-red-500/10',
  children,
  ...props
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const cancelHold = useCallback(() => {
    if (confirmedRef.current) return; // hold already completed, ignore the trailing pointerup
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(0);
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;

    confirmedRef.current = false;
    setProgress(0);
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const next = Math.min(100, (elapsed / duration) * 100);
      setProgress(next);

      if (next >= 100) {
        confirmedRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setProgress(0);
        onConfirm();
      }
    }, 30);
  }, [disabled, duration, onConfirm]);

  return (
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      className={`relative overflow-hidden select-none ${className}`}
      data-testid={props['data-testid']}
      aria-label={props['aria-label']}
    >
      {progress > 0 && (
        <div
          className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-75 ${progressClassName}`}
          style={{ width: `${progress}%` }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-1.5">
        {children(progress)}
      </span>
    </button>
  );
}

export default HoldToConfirmButton;
