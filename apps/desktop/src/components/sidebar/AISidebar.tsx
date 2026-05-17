import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, RotateCcw, Bot, Brain, FileSearch, ShieldCheck, Plane, Wand2, ChevronRight } from "lucide-react";
import { useAIStore } from "@/stores/ai-store";
import { useAgentsStore } from "@/stores/agents-store";
import { useTabsStore } from "@/stores/tabs-store";
import { cn } from "@/lib/cn";

type SidebarTab = "ai" | "agents" | "memory";

/**
 * AI Sidebar — Aether's right-hand panel.
 *
 * Three tabs:
 *   - AI Chat: streaming chat with the model router.
 *   - Agents: launch and monitor long-running multi-agent tasks.
 *   - Memory: inspect, pin and delete memories.
 */
export function AISidebar(): JSX.Element {
  const [tab, setTab] = useState<SidebarTab>("ai");
  return (
    <div className="flex h-full flex-col">
      <Header tab={tab} onChange={setTab} />
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === "ai" && <Panel key="ai"><ChatPanel /></Panel>}
          {tab === "agents" && <Panel key="agents"><AgentsPanel /></Panel>}
          {tab === "memory" && <Panel key="memory"><MemoryPanel /></Panel>}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Header({ tab, onChange }: { tab: SidebarTab; onChange: (t: SidebarTab) => void }): JSX.Element {
  const items: { id: SidebarTab; label: string; icon: JSX.Element }[] = [
    { id: "ai", label: "Chat", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "agents", label: "Agents", icon: <Bot className="h-3.5 w-3.5" /> },
    { id: "memory", label: "Memory", icon: <Brain className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5 [-webkit-app-region:drag]">
      <div className="flex gap-1 [-webkit-app-region:no-drag]">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] uppercase tracking-[0.14em] transition-colors",
              tab === it.id ? "bg-white/10 text-white" : "text-fog-500 hover:text-fog-300",
            )}
          >
            {it.icon}
            {it.label}
          </button>
        ))}
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-fog-500">AI Sidebar</div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
      className="absolute inset-0 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

/* --------------------------------- Chat ------------------------------- */

function ChatPanel(): JSX.Element {
  const messages = useAIStore((s) => s.messages);
  const send = useAIStore((s) => s.send);
  const reset = useAIStore((s) => s.reset);
  const busy = useAIStore((s) => s.busy);
  const activeTab = useTabsStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const [input, setInput] = useState("");

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const prompt = input.trim();
    setInput("");
    void send(prompt);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-fog-500">
          <span>Context</span>
          <span className="h-1 w-1 rounded-full bg-iris" />
          <span className="truncate text-fog-300/80 normal-case tracking-normal">
            {activeTab?.title || "No tab selected"}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? <EmptyChat /> : messages.map((m) => <Bubble key={m.id} role={m.role} streaming={m.streaming} text={m.content} />)}
      </div>

      <form onSubmit={submit} className="border-t border-white/5 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/5 bg-white/[0.03] p-2 focus-within:border-iris/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            rows={1}
            placeholder="Ask anything about this page, or @-mention an agent…"
            className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1 text-[13px] text-white placeholder:text-fog-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => reset()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fog-500 hover:bg-white/5 hover:text-white"
            aria-label="Reset chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              input.trim() && !busy
                ? "bg-gradient-to-br from-iris to-iris-deep text-white shadow-pop"
                : "bg-white/5 text-fog-500",
            )}
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="px-1 pt-2 text-[10px] text-fog-500">
          ⌘↩ to send · Shift+↩ for newline · Sources persist to memory.
        </p>
      </form>
    </div>
  );
}

function Bubble({ role, text, streaming }: { role: "user" | "assistant" | "system"; text: string; streaming: boolean }): JSX.Element {
  if (role === "system") return <></>;
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-hairline",
          isUser ? "bg-iris/20 text-white" : "bg-white/[0.04] text-fog-300",
        )}
      >
        {text}
        {streaming && (
          <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-breathe bg-iris" aria-hidden />
        )}
      </div>
    </motion.div>
  );
}

function EmptyChat(): JSX.Element {
  return (
    <div className="grid h-full place-items-center">
      <div className="max-w-xs space-y-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-iris/30 to-cyan-brand/20 shadow-pop">
          <Sparkles className="h-5 w-5 text-iris" />
        </div>
        <h2 className="aether-grad-text font-display text-[18px] font-semibold">Your AI companion</h2>
        <p className="text-[12.5px] leading-relaxed text-fog-500">
          Summarise the active tab, compare sources, write code, plan a trip — all with context from this browser session.
        </p>
        <div className="grid gap-1.5 pt-2 text-left">
          <Suggestion text="Summarise this page in 5 bullet points" />
          <Suggestion text="Compare the top 3 alternatives" />
          <Suggestion text="Draft a reply to the highlighted text" />
        </div>
      </div>
    </div>
  );
}

function Suggestion({ text }: { text: string }): JSX.Element {
  const send = useAIStore((s) => s.send);
  return (
    <button
      onClick={() => void send(text)}
      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[12px] text-fog-300 hover:border-iris/30 hover:text-white"
    >
      <span>{text}</span>
      <ChevronRight className="h-3 w-3 text-fog-500" />
    </button>
  );
}

/* --------------------------------- Agents ----------------------------- */

function AgentsPanel(): JSX.Element {
  const agents = useAgentsStore((s) => s.agents);
  const tasks = useAgentsStore((s) => s.tasks);
  const run = useAgentsStore((s) => s.run);

  const icons: Record<string, JSX.Element> = {
    search: <FileSearch className="h-4 w-4" />,
    code: <Bot className="h-4 w-4" />,
    "shopping-bag": <Sparkles className="h-4 w-4" />,
    shield: <ShieldCheck className="h-4 w-4" />,
    plane: <Plane className="h-4 w-4" />,
    wand: <Wand2 className="h-4 w-4" />,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-fog-500">Agents</div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {agents.map((a) => (
          <button
            key={a.kind}
            onClick={() => void run({ kind: a.kind, prompt: "Help me with something" })}
            className="flex flex-col items-start gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition-colors hover:border-iris/30 hover:bg-white/[0.06]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-iris/15 text-iris">{icons[a.icon] ?? <Bot className="h-4 w-4" />}</span>
            <span className="text-[12.5px] font-semibold text-white">{a.name}</span>
            <span className="text-[11px] text-fog-500 line-clamp-2">{a.description}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-white/5 px-4 pb-2 pt-3 text-[11px] uppercase tracking-[0.18em] text-fog-500">Tasks</div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {tasks.length === 0 ? (
          <div className="px-3 py-8 text-center text-[11px] text-fog-500">No tasks yet. Run an agent above.</div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="mb-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-white">{t.kind}</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider",
                    t.status === "running" && "bg-iris/15 text-iris",
                    t.status === "queued" && "bg-white/5 text-fog-300",
                    t.status === "completed" && "bg-success/15 text-success",
                    t.status === "failed" && "bg-danger/15 text-danger",
                    t.status === "cancelled" && "bg-white/5 text-fog-500",
                  )}
                >
                  {t.status}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11.5px] text-fog-500">{t.prompt}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full bg-gradient-to-r from-iris to-cyan-brand transition-all" style={{ width: `${Math.round(t.progress * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Memory ----------------------------- */

function MemoryPanel(): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-fog-500">Memory</div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[12.5px] leading-relaxed text-fog-300">
            Aether remembers your projects, interests and conversations. Everything is local, encrypted and fully under your control.
          </p>
          <ul className="mt-3 space-y-1.5 text-[12px] text-fog-500">
            <li>· <span className="text-fog-300">Pin facts</span> the AI should remember.</li>
            <li>· <span className="text-fog-300">Wipe memory</span> any time, granular or full.</li>
            <li>· <span className="text-fog-300">Replay</span> the timeline to understand what&apos;s stored.</li>
          </ul>
        </div>
        <div className="mt-3 rounded-xl border border-iris/30 bg-iris/10 p-3 text-[11.5px] text-fog-300">
          <span className="font-semibold text-iris">Tip:</span>{" "}
          In Settings → Memory, you can enable <em>Private Mode</em> to disable cloud providers and only use Ollama.
        </div>
      </div>
    </div>
  );
}
