/** Register the service worker and notify when a new version is waiting to be applied. */

export type ApplyPwaUpdate = () => void;
export type PwaUpdateWatch = (onWaiting: (apply: ApplyPwaUpdate) => void) => () => void;

export function watchWaitingServiceWorker(
  onWaiting: (apply: ApplyPwaUpdate) => void,
  options?: { reload?: () => void; register?: boolean },
): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};

  const reload = options?.reload ?? (() => window.location.reload());
  const shouldRegister = options?.register ?? import.meta.env.PROD;

  let cancelled = false;
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  const unsubscribers: Array<() => void> = [];

  const onControllerChange = () => {
    if (reloading || !hadController) return;
    reloading = true;
    reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  unsubscribers.push(() => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange));

  const offer = (worker: ServiceWorker) => {
    if (cancelled) return;
    onWaiting(() => {
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  const attach = (reg: ServiceWorkerRegistration) => {
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    const onUpdateFound = () => {
      const installing = reg.installing;
      if (!installing) return;
      const onStateChange = () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) offer(installing);
      };
      installing.addEventListener('statechange', onStateChange);
      unsubscribers.push(() => installing.removeEventListener('statechange', onStateChange));
    };
    reg.addEventListener('updatefound', onUpdateFound);
    unsubscribers.push(() => reg.removeEventListener('updatefound', onUpdateFound));
  };

  void (async () => {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg && shouldRegister) {
        const base = new URL(import.meta.env.BASE_URL, window.location.href);
        reg = await navigator.serviceWorker.register(new URL('sw.js', base).href, { scope: base.href });
      }
      if (!cancelled && reg) attach(reg);
    } catch {
      // Registration can fail in the iOS shell and in dev; the bar just stays hidden.
    }
  })();

  return () => {
    cancelled = true;
    for (const off of unsubscribers) off();
  };
}
