import { useEffect, useRef } from 'react';

/** Nested book views consume browser and hardware Back without leaving the book. */
export function useBookBack(onBack: () => void) {
  const latest = useRef(onBack);
  useEffect(() => { latest.current = onBack; }, [onBack]);
  useEffect(() => {
    const marker = { bookView: crypto.randomUUID() };
    let live = true;
    // Defer until StrictMode's setup/cleanup probe has settled.
    queueMicrotask(() => { if (live) window.history.pushState(marker, ''); });
    const back = (event: Event) => {
      event.preventDefault();
      if (event.type === 'popstate') event.stopImmediatePropagation();
      latest.current();
    };
    window.addEventListener('popstate', back, true);
    window.addEventListener('app-back', back);
    return () => {
      live = false;
      window.removeEventListener('popstate', back, true);
      window.removeEventListener('app-back', back);
      if (window.history.state?.bookView === marker.bookView) window.history.back();
    };
  }, []);
}
