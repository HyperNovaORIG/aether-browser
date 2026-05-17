import type { AetherEventMap, AetherEventName } from "./events";

type Listener<E extends AetherEventName> = (payload: AetherEventMap[E]) => void;

/**
 * Lightweight strongly-typed pub/sub bus.
 *
 * - Synchronous dispatch (listeners are awaited cooperatively via microtasks
 *   when they return a Promise).
 * - Per-event listener sets — O(n) on dispatch.
 * - Wildcard `*` listener receives every event for observability/telemetry.
 *
 * The same implementation is used in both the Electron main process and the
 * renderer. Cross-process forwarding is handled by `@aether/desktop`'s IPC
 * bridge which subscribes here and re-emits through `webContents.send`.
 */
export class EventBus {
  private readonly listeners = new Map<AetherEventName, Set<Listener<AetherEventName>>>();
  private readonly wildcardListeners = new Set<
    (event: AetherEventName, payload: AetherEventMap[AetherEventName]) => void
  >();

  on<E extends AetherEventName>(event: E, listener: Listener<E>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<AetherEventName>);
    return () => {
      set?.delete(listener as Listener<AetherEventName>);
    };
  }

  once<E extends AetherEventName>(event: E, listener: Listener<E>): () => void {
    const off = this.on(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  onAny(listener: (event: AetherEventName, payload: AetherEventMap[AetherEventName]) => void): () => void {
    this.wildcardListeners.add(listener);
    return () => this.wildcardListeners.delete(listener);
  }

  emit<E extends AetherEventName>(event: E, payload: AetherEventMap[E]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          (listener as Listener<E>)(payload);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`[event-bus] listener for ${event} threw`, error);
        }
      }
    }
    for (const wildcard of this.wildcardListeners) {
      try {
        wildcard(event, payload);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[event-bus] wildcard listener threw on ${event}`, error);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }
}

let _bus: EventBus | undefined;

/**
 * Singleton accessor for code that wants to participate in the ambient bus.
 * Tests and embedded use cases should create their own `new EventBus()`.
 */
export function globalBus(): EventBus {
  if (!_bus) _bus = new EventBus();
  return _bus;
}
