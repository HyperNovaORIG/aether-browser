import { contextBridge, ipcRenderer } from "electron";

/**
 * Aether preload — strictly typed surface exposed to the renderer.
 *
 * Every call goes through `ipcRenderer.invoke` to the main process where it
 * is validated, authorized and audited. The renderer can never touch Node
 * APIs directly (sandbox + contextIsolation + nodeIntegration:false).
 */

type EventSubscription = () => void;

const api = {
  app: {
    getInfo: (): Promise<{ version: string; platform: string }> => ipcRenderer.invoke("app:get-info"),
  },
  tabs: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke("tabs:list"),
    create: (input: { url: string; workspaceId?: string }): Promise<unknown> =>
      ipcRenderer.invoke("tabs:create", input),
    close: (tabId: string): Promise<boolean> => ipcRenderer.invoke("tabs:close", tabId),
    activate: (tabId: string): Promise<boolean> => ipcRenderer.invoke("tabs:activate", tabId),
    navigate: (tabId: string, url: string): Promise<boolean> =>
      ipcRenderer.invoke("tabs:navigate", tabId, url),
    goBack: (tabId: string): Promise<void> => ipcRenderer.invoke("tabs:go-back", tabId),
    goForward: (tabId: string): Promise<void> => ipcRenderer.invoke("tabs:go-forward", tabId),
    reload: (tabId: string): Promise<void> => ipcRenderer.invoke("tabs:reload", tabId),
    setBounds: (bounds: { x: number; y: number; width: number; height: number }): Promise<void> =>
      ipcRenderer.invoke("tabs:set-bounds", bounds),
  },
  ai: {
    chat: (request: unknown): Promise<unknown> => ipcRenderer.invoke("ai:chat", request),
    stream: (request: unknown): Promise<{ streamId: string }> => ipcRenderer.invoke("ai:stream", request),
    cancel: (streamId: string): Promise<void> => ipcRenderer.invoke("ai:cancel", streamId),
    listProviders: (): Promise<unknown[]> => ipcRenderer.invoke("ai:list-providers"),
  },
  memory: {
    search: (query: unknown): Promise<unknown[]> => ipcRenderer.invoke("memory:search", query),
    save: (record: unknown): Promise<unknown> => ipcRenderer.invoke("memory:save", record),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke("memory:delete", id),
  },
  agents: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke("agents:list"),
    listTasks: (): Promise<unknown[]> => ipcRenderer.invoke("agents:list-tasks"),
    run: (input: unknown): Promise<unknown> => ipcRenderer.invoke("agents:run", input),
    cancel: (taskId: string): Promise<void> => ipcRenderer.invoke("agents:cancel", taskId),
  },
  workspaces: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke("workspaces:list"),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke("workspaces:create", input),
    switch: (workspaceId: string): Promise<void> => ipcRenderer.invoke("workspaces:switch", workspaceId),
  },
  commands: {
    run: (commandId: string, args?: unknown): Promise<unknown> =>
      ipcRenderer.invoke("commands:run", commandId, args),
  },
  events: {
    /** Subscribe to a domain event mirrored from the main process. */
    on(event: string, listener: (payload: unknown) => void): EventSubscription {
      const wrapped = (_e: Electron.IpcRendererEvent, payload: unknown): void => listener(payload);
      ipcRenderer.on(`bus:${event}`, wrapped);
      return () => ipcRenderer.off(`bus:${event}`, wrapped);
    },
  },
  stream: {
    on(streamId: string, handler: (chunk: unknown) => void): EventSubscription {
      const channel = `ai:stream-chunk:${streamId}`;
      const wrapped = (_e: Electron.IpcRendererEvent, payload: unknown): void => handler(payload);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.off(channel, wrapped);
    },
  },
};

contextBridge.exposeInMainWorld("aether", api);

export type AetherApi = typeof api;
