import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Settings, Sparkles, Workflow, FolderGit2, Compass, Library } from "lucide-react";
import { useTabsStore } from "@/stores/tabs-store";
import { TabItem } from "./TabItem";
import { cn } from "@/lib/cn";

/**
 * Vertical tab rail — combines Arc's signature vertical tabs with a
 * Linear-style top navigation. The rail also exposes quick actions and
 * workspace pickers in the future.
 */
export function TabRail(): JSX.Element {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const create = useTabsStore((s) => s.create);

  const pinned = useMemo(() => tabs.filter((t) => t.pinned), [tabs]);
  const others = useMemo(() => tabs.filter((t) => !t.pinned), [tabs]);

  return (
    <div className="flex h-full flex-col">
      {/* Brand row */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-4 [-webkit-app-region:drag]">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-iris to-cyan-brand shadow-pop">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold tracking-tight text-white">Aether</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-fog-500">v0.1 · MVP</span>
        </div>
      </div>

      <SidebarSection>
        <NavRow icon={<Compass className="h-4 w-4" />} label="Discover" hint="⌘D" />
        <NavRow icon={<Library className="h-4 w-4" />} label="Library" hint="⌘L" />
        <NavRow icon={<Workflow className="h-4 w-4" />} label="Automations" />
        <NavRow icon={<FolderGit2 className="h-4 w-4" />} label="Workspaces" />
      </SidebarSection>

      {pinned.length > 0 && (
        <SidebarSection title="Pinned">
          {pinned.map((tab) => (
            <TabItem key={tab.id} tab={tab} active={activeTabId === tab.id} />
          ))}
        </SidebarSection>
      )}

      <SidebarSection title="Tabs" actions={<button className="rounded-md p-1 text-fog-500 hover:bg-white/5 hover:text-white" onClick={() => void create()} aria-label="New tab"><Plus className="h-3.5 w-3.5" /></button>}>
        <AnimatePresence initial={false}>
          {others.map((tab) => (
            <motion.div
              key={tab.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
            >
              <TabItem tab={tab} active={activeTabId === tab.id} />
            </motion.div>
          ))}
        </AnimatePresence>
        {others.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-fog-500">No tabs yet.<br />Press ⌘T to open one.</div>
        )}
      </SidebarSection>

      <div className="mt-auto px-3 py-3">
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-fog-300 hover:bg-white/5 hover:text-white">
          <Search className="h-4 w-4" />
          <span>Search…</span>
          <kbd className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-fog-500">⌘K</kbd>
        </button>
        <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-fog-300 hover:bg-white/5 hover:text-white">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

function SidebarSection(props: { title?: string; actions?: React.ReactNode; children: React.ReactNode }): JSX.Element {
  return (
    <div className="px-2 pb-2">
      {props.title && (
        <div className="flex items-center justify-between px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-fog-500">
          <span>{props.title}</span>
          {props.actions}
        </div>
      )}
      <div className="flex flex-col gap-0.5">{props.children}</div>
    </div>
  );
}

function NavRow({ icon, label, hint }: { icon: React.ReactNode; label: string; hint?: string }): JSX.Element {
  return (
    <button
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] text-fog-300 transition-colors",
        "hover:bg-white/5 hover:text-white",
      )}
    >
      <span className="text-fog-500 group-hover:text-iris">{icon}</span>
      <span>{label}</span>
      {hint && <kbd className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-fog-500">{hint}</kbd>}
    </button>
  );
}
