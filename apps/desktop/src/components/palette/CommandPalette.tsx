import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  Brain,
  Workflow,
  ArrowRight,
} from "lucide-react";
import { usePaletteStore } from "@/stores/palette-store";
import { useTabsStore } from "@/stores/tabs-store";
import { useAIStore } from "@/stores/ai-store";
import { useAgentsStore } from "@/stores/agents-store";
import { cn } from "@/lib/cn";

/**
 * Smart Command Palette (⌘K).
 *
 * Sources:
 *   1. Static commands (open tab, mute, group, etc.)
 *   2. Open tabs (fuzzy match on title/url)
 *   3. Agents (run with the current query)
 *   4. AI suggestion — always shown at the bottom, runs the chat with the query.
 */

type CommandKind = "command" | "tab" | "agent" | "ai";

interface PaletteCommand {
  id: string;
  kind: CommandKind;
  title: string;
  hint?: string;
  icon: JSX.Element;
  run: () => Promise<void> | void;
}

export function CommandPalette(): JSX.Element {
  const open = usePaletteStore((s) => s.open);
  const query = usePaletteStore((s) => s.query);
  const setQuery = usePaletteStore((s) => s.setQuery);
  const hide = usePaletteStore((s) => s.hide);

  const tabs = useTabsStore((s) => s.tabs);
  const create = useTabsStore((s) => s.create);
  const activate = useTabsStore((s) => s.activate);
  const agents = useAgentsStore((s) => s.agents);
  const runAgent = useAgentsStore((s) => s.run);
  const send = useAIStore((s) => s.send);

  const [index, setIndex] = useState(0);

  const items = useMemo<PaletteCommand[]>(() => {
    const q = query.trim().toLowerCase();
    const base: PaletteCommand[] = [
      {
        id: "tab.new",
        kind: "command",
        title: "Open new tab",
        hint: "⌘T",
        icon: <Plus className="h-4 w-4" />,
        run: () => create(),
      },
      {
        id: "tab.mute-all",
        kind: "command",
        title: "Mute all noisy tabs",
        icon: <VolumeX className="h-4 w-4" />,
        run: () => undefined,
      },
      {
        id: "tab.unmute-all",
        kind: "command",
        title: "Unmute all tabs",
        icon: <Volume2 className="h-4 w-4" />,
        run: () => undefined,
      },
      {
        id: "workflow.create",
        kind: "command",
        title: "Create automation…",
        icon: <Workflow className="h-4 w-4" />,
        run: () => undefined,
      },
      {
        id: "memory.create",
        kind: "command",
        title: "Save note to memory",
        icon: <Brain className="h-4 w-4" />,
        run: () => undefined,
      },
    ];

    const tabResults: PaletteCommand[] = tabs
      .filter((t) => !q || `${t.title} ${t.url}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({
        id: `tab:${t.id}`,
        kind: "tab",
        title: t.title || t.url,
        hint: t.url,
        icon: <Search className="h-4 w-4" />,
        run: () => activate(t.id),
      }));

    const agentResults: PaletteCommand[] = agents.map((a) => ({
      id: `agent:${a.kind}`,
      kind: "agent",
      title: `${a.name} → ${query || "ask me"}`,
      hint: a.description,
      icon: <Bot className="h-4 w-4" />,
      run: () => runAgent({ kind: a.kind, prompt: query || "Help me" }),
    }));

    const aiAction: PaletteCommand = {
      id: "ai:ask",
      kind: "ai",
      title: q ? `Ask AI: "${query}"` : "Ask AI…",
      hint: "Stream answer in the sidebar",
      icon: <Sparkles className="h-4 w-4" />,
      run: () => send(query || "Hello"),
    };

    const filtered = q
      ? base.filter((c) => c.title.toLowerCase().includes(q))
      : base;

    return [...filtered, ...tabResults, ...agentResults, aiAction];
  }, [query, tabs, agents, create, activate, runAgent, send]);

  useEffect(() => setIndex(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const next = items[index];
        if (next) {
          void next.run();
          hide();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, index, hide]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/70 pt-[14vh] backdrop-blur-sm"
          onClick={hide}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
            className="w-[640px] max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 bg-ink-800/95 shadow-panel backdrop-blur-glass"
          >
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <Search className="h-4 w-4 text-fog-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, ask AI, or search…"
                className="flex-1 bg-transparent text-[14px] text-white placeholder:text-fog-500 focus:outline-none"
              />
              <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-fog-500">esc</kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <div className="px-3 py-6 text-center text-[12.5px] text-fog-500">No matches.</div>
              )}
              {items.map((item, i) => (
                <button
                  key={item.id}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    void item.run();
                    hide();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                    i === index ? "bg-white/10" : "hover:bg-white/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
                      item.kind === "ai" ? "bg-gradient-to-br from-iris/30 to-cyan-brand/20 text-iris" : "bg-white/5 text-fog-300",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-medium text-white">{item.title}</span>
                    {item.hint && <span className="truncate text-[11px] text-fog-500">{item.hint}</span>}
                  </span>
                  <span className="ml-auto flex items-center text-[10px] text-fog-500">
                    {item.kind.toUpperCase()}
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/5 px-4 py-2 text-[10px] text-fog-500">
              <span>↑↓ to navigate · ↩ to run</span>
              <span>Aether ⌘K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
