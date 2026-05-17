/**
 * Strongly-typed shim around `window.aether` (the preload bridge).
 *
 * Used by every React component, hook and Zustand store so the renderer does
 * not have to repeat `window.aether?.tabs?.list` defensive chains.
 */

import type {
  AgentTask,
  Tab,
  Workspace,
  MemoryRecord,
} from "@aether/shared";

export interface AetherApi {
  app: { getInfo(): Promise<{ version: string; platform: string }> };
  tabs: {
    list(): Promise<Tab[]>;
    create(input: { url: string; workspaceId?: string }): Promise<Tab>;
    close(tabId: string): Promise<boolean>;
    activate(tabId: string): Promise<boolean>;
    navigate(tabId: string, url: string): Promise<boolean>;
    goBack(tabId: string): Promise<void>;
    goForward(tabId: string): Promise<void>;
    reload(tabId: string): Promise<void>;
    setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  };
  ai: {
    chat(request: unknown): Promise<unknown>;
    stream(request: unknown): Promise<{ streamId: string }>;
    cancel(streamId: string): Promise<void>;
    listProviders(): Promise<{ name: string; available: boolean; models: { model: string }[] }[]>;
  };
  memory: {
    search(query: { text?: string; limit?: number }): Promise<MemoryRecord[]>;
    save(record: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt" | "embedding">): Promise<MemoryRecord>;
    delete(id: string): Promise<boolean>;
  };
  agents: {
    list(): Promise<{ kind: string; name: string; description: string; icon: string }[]>;
    listTasks(): Promise<AgentTask[]>;
    run(input: { kind: string; prompt: string; tabId?: string }): Promise<AgentTask>;
    cancel(taskId: string): Promise<void>;
  };
  workspaces: {
    list(): Promise<Workspace[]>;
    create(input: { name: string }): Promise<Workspace>;
    switch(workspaceId: string): Promise<void>;
  };
  commands: { run(commandId: string, args?: unknown): Promise<unknown> };
  events: { on(event: string, listener: (payload: unknown) => void): () => void };
  stream: { on(streamId: string, handler: (chunk: unknown) => void): () => void };
}

declare global {
  interface Window {
    aether?: AetherApi;
  }
}

/**
 * Returns the Aether API. When running outside Electron (e.g. Storybook,
 * Vite dev with no preload) we fall back to a no-op mock so the UI still
 * renders for design previews.
 */
export function api(): AetherApi {
  if (typeof window !== "undefined" && window.aether) return window.aether;
  return MOCK_API;
}

const MOCK_API: AetherApi = {
  app: { getInfo: async () => ({ version: "dev", platform: "web" }) },
  tabs: {
    list: async () => [],
    create: async () => ({
      id: "tab_mock" as Tab["id"],
      workspaceId: "wks_default" as Tab["workspaceId"],
      profileId: "prf_default" as Tab["profileId"],
      url: "https://aether.local/newtab",
      title: "New Tab",
      pinned: false,
      muted: false,
      loading: false,
      canGoBack: false,
      canGoForward: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      tags: [],
    }),
    close: async () => true,
    activate: async () => true,
    navigate: async () => true,
    goBack: async () => undefined,
    goForward: async () => undefined,
    reload: async () => undefined,
    setBounds: async () => undefined,
  },
  ai: {
    chat: async () => ({ content: "[mock] Aether is not connected", model: "mock", provider: "echo" }),
    stream: async () => ({ streamId: "mock" }),
    cancel: async () => undefined,
    listProviders: async () => [{ name: "echo", available: true, models: [{ model: "echo-1" }] }],
  },
  memory: {
    search: async () => [],
    save: async () => ({
      id: "mem_mock" as MemoryRecord["id"],
      scope: "user",
      kind: "note",
      text: "",
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ttlMs: 0,
      pinned: false,
    }),
    delete: async () => true,
  },
  agents: {
    list: async () => [],
    listTasks: async () => [],
    run: async () => ({
      id: "tsk_mock" as AgentTask["id"],
      agentId: "agt_mock" as AgentTask["agentId"],
      kind: "research",
      prompt: "",
      status: "queued",
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      logs: [],
    }),
    cancel: async () => undefined,
  },
  workspaces: {
    list: async () => [],
    create: async (input) => ({
      id: "wks_mock" as Workspace["id"],
      profileId: "prf_mock" as Workspace["profileId"],
      name: input.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    switch: async () => undefined,
  },
  commands: { run: async () => ({ ok: true }) },
  events: { on: () => () => undefined },
  stream: { on: () => () => undefined },
};
