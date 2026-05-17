import { create } from "zustand";
import type { Tab } from "@aether/shared";
import { api } from "@/lib/aether-api";

interface TabsState {
  tabs: Tab[];
  activeTabId?: string;
  load(): Promise<void>;
  create(url?: string): Promise<void>;
  close(tabId: string): Promise<void>;
  activate(tabId: string): Promise<void>;
  navigate(tabId: string, url: string): Promise<void>;
  refresh(): Promise<void>;
  upsert(tab: Tab): void;
  apply(tabId: string, changes: Partial<Tab>): void;
  remove(tabId: string): void;
  setActive(tabId: string): void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],

  async load() {
    const tabs = await api().tabs.list();
    set({ tabs });
  },

  async create(url) {
    const tab = await api().tabs.create({ url: url ?? "https://aether.local/newtab" });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },

  async close(tabId) {
    await api().tabs.close(tabId);
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id !== tabId),
      activeTabId: state.activeTabId === tabId ? state.tabs.at(-2)?.id : state.activeTabId,
    }));
  },

  async activate(tabId) {
    await api().tabs.activate(tabId);
    set({ activeTabId: tabId });
  },

  async navigate(tabId, url) {
    await api().tabs.navigate(tabId, url);
  },

  async refresh() {
    await get().load();
  },

  upsert(tab) {
    set((state) => {
      const existing = state.tabs.findIndex((t) => t.id === tab.id);
      if (existing === -1) return { tabs: [...state.tabs, tab] };
      const next = [...state.tabs];
      next[existing] = { ...next[existing], ...tab };
      return { tabs: next };
    });
  },

  apply(tabId, changes) {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...changes } : t)),
    }));
  },

  remove(tabId) {
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id !== tabId),
      activeTabId: state.activeTabId === tabId ? state.tabs.at(-2)?.id : state.activeTabId,
    }));
  },

  setActive(tabId) {
    set({ activeTabId: tabId });
  },
}));
