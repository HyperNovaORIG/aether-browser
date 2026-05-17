import { useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { useTabsStore } from "@/stores/tabs-store";
import { useAgentsStore } from "@/stores/agents-store";
import { usePaletteStore } from "@/stores/palette-store";
import { api } from "@/lib/aether-api";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useBusEvents } from "@/hooks/useBusEvents";

export function App(): JSX.Element {
  const loadTabs = useTabsStore((s) => s.load);
  const upsertTab = useTabsStore((s) => s.upsert);
  const applyTab = useTabsStore((s) => s.apply);
  const removeTab = useTabsStore((s) => s.remove);
  const setActive = useTabsStore((s) => s.setActive);
  const loadAgents = useAgentsStore((s) => s.load);
  const upsertTask = useAgentsStore((s) => s.upsertTask);
  const togglePalette = usePaletteStore((s) => s.toggle);

  useEffect(() => {
    void loadTabs();
    void loadAgents();
    if (useTabsStore.getState().tabs.length === 0) {
      void api().tabs.create({ url: "https://aether.local/newtab" });
    }
  }, [loadTabs, loadAgents]);

  useGlobalShortcuts({
    onPalette: () => togglePalette(),
    onNewTab: () => void api().tabs.create({ url: "https://aether.local/newtab" }),
  });

  useBusEvents({
    "tab:created": (p) => upsertTab(p.tab),
    "tab:updated": (p) => applyTab(p.tabId, p.changes),
    "tab:closed": (p) => removeTab(p.tabId),
    "tab:activated": (p) => setActive(p.tabId),
    "agent:task-updated": (p) => upsertTask(p.task),
    "agent:task-completed": (p) => upsertTask(p.task),
    "agent:task-created": (p) => upsertTask(p.task),
  });

  return (
    <>
      <Shell />
      <CommandPalette />
    </>
  );
}
