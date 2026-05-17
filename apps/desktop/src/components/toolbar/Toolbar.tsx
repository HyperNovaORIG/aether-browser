import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCw, Shield, Sparkles, Star, Lock } from "lucide-react";
import { useTabsStore } from "@/stores/tabs-store";
import { api } from "@/lib/aether-api";
import { cn } from "@/lib/cn";

/**
 * Top toolbar — back/forward, address bar, AI quick action.
 *
 * The address bar accepts both URLs and natural-language commands. If the
 * value doesn't look like a URL we treat it as a query for the AI search
 * engine (delegated to the Research Agent / AI Sidebar).
 */
export function Toolbar(): JSX.Element {
  const activeTab = useTabsStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigate = useTabsStore((s) => s.navigate);
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(activeTab?.url ?? "");
  }, [activeTab?.url]);

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!activeTab) return;
    const trimmed = value.trim();
    const url = looksLikeUrl(trimmed) ? normaliseUrl(trimmed) : `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
    void navigate(activeTab.id, url);
  }

  return (
    <div className="flex h-14 items-center gap-2 border-b border-white/5 bg-ink-900/30 px-3 [-webkit-app-region:drag]">
      <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
        <ToolbarButton onClick={() => activeTab && void api().tabs.goBack(activeTab.id)} disabled={!activeTab?.canGoBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => activeTab && void api().tabs.goForward(activeTab.id)} disabled={!activeTab?.canGoForward} aria-label="Forward">
          <ArrowRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => activeTab && void api().tabs.reload(activeTab.id)} aria-label="Reload">
          <RotateCw className={cn("h-4 w-4", activeTab?.loading && "animate-spin")} />
        </ToolbarButton>
      </div>

      <form onSubmit={submit} className="flex flex-1 items-center [-webkit-app-region:no-drag]">
        <motion.div
          layout
          className="group flex h-9 w-full items-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] px-3 transition-colors focus-within:border-iris/40 focus-within:bg-white/[0.08]"
        >
          <Lock className="h-3.5 w-3.5 text-success" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search the web, ask the AI, or paste a URL"
            className="h-full w-full bg-transparent text-[13px] text-white placeholder:text-fog-500 focus:outline-none"
            spellCheck={false}
            autoCorrect="off"
          />
          <button type="button" aria-label="AI quick action" className="rounded-md p-1 text-fog-500 hover:bg-white/10 hover:text-iris">
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </form>

      <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
        <ToolbarButton aria-label="Site security">
          <Shield className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton aria-label="Bookmark">
          <Star className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  return (
    <button
      {...props}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-fog-300 transition-colors",
        "hover:bg-white/5 hover:text-white disabled:text-fog-500/40 disabled:hover:bg-transparent",
      )}
    />
  );
}

function looksLikeUrl(value: string): boolean {
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  return /^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(value);
}

function normaliseUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
