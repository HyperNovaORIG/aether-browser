import { useEffect } from "react";

export interface ShortcutHandlers {
  onPalette?: () => void;
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onToggleSidebar?: () => void;
}

/**
 * Single keyboard layer for the renderer. Lives at the App level so global
 * shortcuts (Cmd+K, Cmd+T, etc.) don't fight each other across components.
 *
 * Mac uses ⌘, others use Ctrl. We rely on `event.metaKey || event.ctrlKey`
 * so the same shortcut works on every OS.
 */
export function useGlobalShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault();
          handlers.onPalette?.();
          return;
        case "t":
          e.preventDefault();
          handlers.onNewTab?.();
          return;
        case "w":
          e.preventDefault();
          handlers.onCloseTab?.();
          return;
        case "b":
          e.preventDefault();
          handlers.onToggleSidebar?.();
          return;
        default:
          return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
