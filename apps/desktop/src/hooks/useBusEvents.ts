import { useEffect } from "react";
import type { AetherEventMap, AetherEventName } from "@aether/event-bus";
import { api } from "@/lib/aether-api";

type Handlers = {
  [E in AetherEventName]?: (payload: AetherEventMap[E]) => void;
};

/**
 * Subscribe to typed domain events forwarded from the main process. The
 * preload bridge re-emits each `bus:<event>` channel and we deserialise
 * them into structured callbacks.
 */
export function useBusEvents(handlers: Handlers): void {
  useEffect(() => {
    const unsubs = Object.entries(handlers).map(([event, handler]) => {
      if (!handler) return () => undefined;
      return api().events.on(event, (payload) => {
        (handler as (p: unknown) => void)(payload);
      });
    });
    return () => unsubs.forEach((off) => off());
  }, [handlers]);
}
