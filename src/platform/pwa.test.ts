import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchWaitingServiceWorker } from './pwa';

type Listener = EventListenerOrEventListenerObject;

function asListener(fn: Listener): (event: Event) => void {
  return typeof fn === 'function' ? fn : (event) => fn.handleEvent(event);
}

function mockServiceWorker(options: {
  waiting?: FakeWorker | null;
  installing?: FakeWorker | null;
  controller?: FakeWorker | null;
}) {
  const swListeners = new Map<string, Set<Listener>>();
  const regListeners = new Map<string, Set<Listener>>();

  const add = (bag: Map<string, Set<Listener>>, type: string, fn: Listener) => {
    const set = bag.get(type) ?? new Set();
    set.add(fn);
    bag.set(type, set);
  };
  const remove = (bag: Map<string, Set<Listener>>, type: string, fn: Listener) => {
    bag.get(type)?.delete(fn);
  };
  const emit = (bag: Map<string, Set<Listener>>, type: string, event: Event) => {
    for (const fn of [...(bag.get(type) ?? [])]) asListener(fn)(event);
  };

  const reg = {
    waiting: options.waiting ?? null,
    installing: options.installing ?? null,
    addEventListener: (type: string, fn: Listener) => add(regListeners, type, fn),
    removeEventListener: (type: string, fn: Listener) => remove(regListeners, type, fn),
    dispatch: (type: string) => emit(regListeners, type, new Event(type)),
  };

  const serviceWorker = {
    controller: options.controller ?? null,
    getRegistration: vi.fn().mockResolvedValue(reg) as ReturnType<typeof vi.fn> & {
      mockResolvedValueOnce: (value: typeof reg | undefined) => void;
    },
    register: vi.fn().mockResolvedValue(reg),
    addEventListener: (type: string, fn: Listener) => add(swListeners, type, fn),
    removeEventListener: (type: string, fn: Listener) => remove(swListeners, type, fn),
    dispatch: (type: string) => emit(swListeners, type, new Event(type)),
  };

  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
  return { reg, serviceWorker };
}

class FakeWorker {
  state: ServiceWorkerState;
  postMessage = vi.fn();
  private listeners = new Set<Listener>();

  constructor(state: ServiceWorkerState) {
    this.state = state;
  }

  addEventListener(type: string, fn: Listener) {
    if (type === 'statechange') this.listeners.add(fn);
  }

  removeEventListener(_type: string, fn: Listener) {
    this.listeners.delete(fn);
  }

  setState(state: ServiceWorkerState) {
    this.state = state;
    for (const fn of [...this.listeners]) asListener(fn)(new Event('statechange'));
  }
}

describe('watchWaitingServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers skipWaiting when a worker is already waiting and a controller is present', async () => {
    const waiting = new FakeWorker('installed');
    const controller = new FakeWorker('activated');
    mockServiceWorker({ waiting, controller });
    const reload = vi.fn();
    const onWaiting = vi.fn();

    const stop = watchWaitingServiceWorker(onWaiting, { reload, register: false });
    await vi.waitFor(() => expect(onWaiting).toHaveBeenCalledTimes(1));

    const apply = onWaiting.mock.calls[0][0] as () => void;
    apply();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled();

    (navigator.serviceWorker as unknown as { dispatch: (type: string) => void }).dispatch('controllerchange');
    expect(reload).toHaveBeenCalledTimes(1);
    stop();
  });

  it('does not offer an update on the first install, when no controller is present', async () => {
    const waiting = new FakeWorker('installed');
    mockServiceWorker({ waiting, controller: null });
    const onWaiting = vi.fn();

    const stop = watchWaitingServiceWorker(onWaiting, { reload: vi.fn(), register: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(onWaiting).not.toHaveBeenCalled();
    stop();
  });

  it('offers skipWaiting when a new worker finishes installing while a controller is present', async () => {
    const controller = new FakeWorker('activated');
    const installing = new FakeWorker('installing');
    const { reg } = mockServiceWorker({ installing, controller, waiting: null });
    const onWaiting = vi.fn();

    const stop = watchWaitingServiceWorker(onWaiting, { reload: vi.fn(), register: false });
    await vi.waitFor(() => expect(reg.addEventListener).toBeDefined());
    await Promise.resolve();
    await Promise.resolve();

    reg.dispatch('updatefound');
    expect(onWaiting).not.toHaveBeenCalled();
    installing.setState('installed');
    expect(onWaiting).toHaveBeenCalledTimes(1);

    const apply = onWaiting.mock.calls[0][0] as () => void;
    apply();
    expect(installing.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    stop();
  });

  it('registers the service worker when asked and none is registered yet', async () => {
    const waiting = new FakeWorker('installed');
    const controller = new FakeWorker('activated');
    const { serviceWorker, reg } = mockServiceWorker({ waiting, controller });
    serviceWorker.getRegistration.mockResolvedValueOnce(undefined);
    const onWaiting = vi.fn();

    const stop = watchWaitingServiceWorker(onWaiting, { reload: vi.fn(), register: true });
    await vi.waitFor(() => expect(serviceWorker.register).toHaveBeenCalledTimes(1));
    expect(serviceWorker.register.mock.calls[0][0]).toMatch(/sw\.js$/);
    await vi.waitFor(() => expect(onWaiting).toHaveBeenCalledTimes(1));
    expect(reg.waiting).toBe(waiting);
    stop();
  });
});
