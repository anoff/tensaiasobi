import { useCallback, useEffect, useRef, useState } from 'react';

export interface DragState<T> {
  item: T;
  x: number;
  y: number;
  moved: boolean;
}

/** Movement (px) that turns a press into a drag; less is a tap. */
const DRAG_SLOP = 6;

/**
 * Pointer drag with window listeners (mouse and touch alike). `onDrop` gets the client point
 * and whether the pointer really moved, so callers can treat a short press as a tap.
 */
export function usePointerDrag<T>(onDrop: (item: T, x: number, y: number, moved: boolean) => void) {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const start = useCallback((item: T, e: React.PointerEvent) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    cleanup.current?.();
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    setDrag({ item, x: sx, y: sy, moved });
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > DRAG_SLOP) moved = true;
      setDrag({ item, x: ev.clientX, y: ev.clientY, moved });
    };
    const end = (ev: PointerEvent, cancelled: boolean) => {
      cleanup.current?.();
      setDrag(null);
      if (!cancelled) onDropRef.current(item, ev.clientX, ev.clientY, moved);
    };
    const up = (ev: PointerEvent) => end(ev, false);
    const cancel = (ev: PointerEvent) => end(ev, true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    cleanup.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      cleanup.current = null;
    };
  }, []);

  return { drag, start };
}
