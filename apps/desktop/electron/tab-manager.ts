import { BrowserView, session, type BrowserWindow } from "electron";
import { globalBus } from "@aether/event-bus";
import { newId, type Tab, type TabId, type WorkspaceId } from "@aether/shared";
import type { ProfileManager } from "./profile";

export interface TabManagerOptions {
  window: BrowserWindow;
  profileManager: ProfileManager;
}

interface TabRecord {
  tab: Tab;
  view: BrowserView;
}

export interface TabBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Aether Tab Manager.
 *
 * Tabs are implemented as Electron `BrowserView`s attached to the main
 * window. The renderer owns the chrome (toolbar, tabs sidebar, AI sidebar)
 * and delegates the actual web content area's bounds to this manager.
 *
 * BrowserView is the right abstraction for a multi-tab Electron browser:
 *   - real Chromium, per-tab isolation, fast switching
 *   - native scroll, devtools, find-in-page
 *   - no Z-fighting with the renderer because the view is composited above it
 *
 * Future iterations may swap to the in-progress `WebContentsView` API, but
 * the public TabManager surface stays unchanged.
 */
export class TabManager {
  private readonly window: BrowserWindow;
  private readonly profileManager: ProfileManager;
  private readonly tabs = new Map<TabId, TabRecord>();
  private activeTabId?: TabId;
  private contentBounds: TabBounds = { x: 280, y: 56, width: 800, height: 600 };

  constructor(options: TabManagerOptions) {
    this.window = options.window;
    this.profileManager = options.profileManager;
  }

  list(): Tab[] {
    return Array.from(this.tabs.values()).map((r) => r.tab);
  }

  active(): Tab | undefined {
    return this.activeTabId ? this.tabs.get(this.activeTabId)?.tab : undefined;
  }

  setBounds(bounds: TabBounds): void {
    this.contentBounds = bounds;
    this.layoutActive();
  }

  layoutActive(): void {
    if (!this.activeTabId) return;
    const record = this.tabs.get(this.activeTabId);
    if (record) record.view.setBounds(this.contentBounds);
  }

  create(input: { url: string; workspaceId?: WorkspaceId }): Tab {
    const profile = this.profileManager.getDefault();
    const view = new BrowserView({
      webPreferences: {
        partition: profile.partition,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webgl: true,
      },
    });
    const tabId = newId("tab");
    const tab: Tab = {
      id: tabId,
      workspaceId: (input.workspaceId ?? ("wks_default" as WorkspaceId)),
      profileId: profile.id,
      url: input.url || "https://aether.local/newtab",
      title: input.url || "New Tab",
      pinned: false,
      muted: false,
      loading: true,
      canGoBack: false,
      canGoForward: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      tags: [],
    };

    this.wireEvents(tab, view);
    this.tabs.set(tabId, { tab, view });
    globalBus().emit("tab:created", { tab });
    void view.webContents.loadURL(tab.url).catch(() => {
      this.update(tabId, { loading: false, title: "Failed to load" });
    });
    return tab;
  }

  close(tabId: TabId): boolean {
    const record = this.tabs.get(tabId);
    if (!record) return false;
    this.window.removeBrowserView(record.view);
    record.view.webContents.close();
    this.tabs.delete(tabId);
    if (this.activeTabId === tabId) {
      this.activeTabId = undefined;
      const next = Array.from(this.tabs.keys()).pop();
      if (next) this.activate(next);
    }
    globalBus().emit("tab:closed", { tabId });
    return true;
  }

  activate(tabId: TabId): boolean {
    const record = this.tabs.get(tabId);
    if (!record) return false;
    if (this.activeTabId && this.activeTabId !== tabId) {
      const prev = this.tabs.get(this.activeTabId);
      if (prev) this.window.removeBrowserView(prev.view);
    }
    this.activeTabId = tabId;
    this.window.addBrowserView(record.view);
    record.view.setBounds(this.contentBounds);
    record.tab.lastActiveAt = Date.now();
    globalBus().emit("tab:activated", { tabId });
    return true;
  }

  navigate(tabId: TabId, url: string): boolean {
    const record = this.tabs.get(tabId);
    if (!record) return false;
    void record.view.webContents.loadURL(url);
    this.update(tabId, { url, loading: true });
    globalBus().emit("tab:navigated", { tabId, url });
    return true;
  }

  goBack(tabId: TabId): void {
    const wc = this.tabs.get(tabId)?.view.webContents;
    if (wc?.canGoBack()) wc.goBack();
  }

  goForward(tabId: TabId): void {
    const wc = this.tabs.get(tabId)?.view.webContents;
    if (wc?.canGoForward()) wc.goForward();
  }

  reload(tabId: TabId): void {
    const wc = this.tabs.get(tabId)?.view.webContents;
    wc?.reload();
  }

  private wireEvents(tab: Tab, view: BrowserView): void {
    const wc = view.webContents;
    wc.on("did-start-loading", () => this.update(tab.id, { loading: true }));
    wc.on("did-stop-loading", () =>
      this.update(tab.id, {
        loading: false,
        canGoBack: wc.canGoBack(),
        canGoForward: wc.canGoForward(),
      }),
    );
    wc.on("page-title-updated", (_e, title) => this.update(tab.id, { title }));
    wc.on("page-favicon-updated", (_e, favicons) => this.update(tab.id, { faviconUrl: favicons[0] }));
    wc.on("did-navigate", (_e, url) => this.update(tab.id, { url }));
    wc.on("did-navigate-in-page", (_e, url) => this.update(tab.id, { url }));
  }

  private update(tabId: TabId, changes: Partial<Tab>): void {
    const record = this.tabs.get(tabId);
    if (!record) return;
    record.tab = { ...record.tab, ...changes };
    this.tabs.set(tabId, record);
    globalBus().emit("tab:updated", { tabId, changes });
  }
}

export type { Tab };
export function defaultStartPartition(): string {
  return session.defaultSession.getStoragePath() ?? "default";
}
