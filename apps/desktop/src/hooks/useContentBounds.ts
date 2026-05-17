import { useEffect, useRef } from "react";
import { api } from "@/lib/aether-api";

/**
 * Reports the bounds of the web content viewport to the main process, so the
 * native `BrowserView` is positioned to overlay the renderer's chrome.
 *
 * Updates whenever the element resizes (using `ResizeObserver`) or the
 * window is resized.
 */
export function useContentBounds<T extends HTMLElement>(ref: React.RefObject<T>): void {
  const lastBounds = useRef<{ x: number; y: number; width: number; height: number }>();

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const send = (): void => {
      const rect = el.getBoundingClientRect();
      const next = {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height)),
      };
      const prev = lastBounds.current;
      if (
        prev &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return;
      }
      lastBounds.current = next;
      void api().tabs.setBounds(next);
    };

    send();
    const ro = new ResizeObserver(send);
    ro.observe(el);
    window.addEventListener("resize", send);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", send);
    };
  }, [ref]);
}
