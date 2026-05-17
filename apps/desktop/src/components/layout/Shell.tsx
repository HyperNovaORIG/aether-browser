import { useRef } from "react";
import { motion } from "framer-motion";
import { TabRail } from "@/components/tabs/TabRail";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { AISidebar } from "@/components/sidebar/AISidebar";
import { useContentBounds } from "@/hooks/useContentBounds";

/**
 * Aether main layout — three columns separated by glass dividers:
 *
 *   ┌───────────┬──────────────────────────┬───────────────┐
 *   │           │  Toolbar (address)       │  AI sidebar   │
 *   │ Vertical  ├──────────────────────────┤   (chat,      │
 *   │  tabs     │                          │   agents,     │
 *   │ rail      │  BrowserView viewport    │   memory)     │
 *   │           │                          │               │
 *   └───────────┴──────────────────────────┴───────────────┘
 *
 * The BrowserView is rendered natively by Electron above this DOM tree; the
 * `<div ref="viewport">` is a transparent placeholder whose bounds we relay
 * to the main process via `useContentBounds`.
 */
export function Shell(): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null);
  useContentBounds(viewportRef);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className="grid h-screen w-screen overflow-hidden text-fog-300"
      style={{ gridTemplateColumns: "260px 1fr 380px" }}
    >
      <aside className="relative border-r border-white/5 backdrop-blur-glass bg-ink-900/40">
        <TabRail />
      </aside>

      <main className="relative flex flex-col">
        <Toolbar />
        <div ref={viewportRef} className="relative flex-1" />
        {/* When no tab is active or page is loading, an empty-state overlay sits on top of the BrowserView gap. */}
      </main>

      <aside className="relative border-l border-white/5 backdrop-blur-glass bg-ink-900/40">
        <AISidebar />
      </aside>
    </motion.div>
  );
}
