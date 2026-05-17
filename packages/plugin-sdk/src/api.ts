import type { AICompletionRequest, AICompletionResponse, MemoryRecord, Tab } from "@aether/shared";

/**
 * Aether Plugin SDK — the public surface exposed to plugin code.
 *
 * Plugins receive a `PluginHost` object on activation:
 *
 *   export default async function activate(host: PluginHost) {
 *     host.ui.registerSidebarPanel(...);
 *     host.commands.register({ id: "translate-page", run: async () => { ... } });
 *   }
 *
 * Every call is checked against the plugin's granted capabilities.
 */
export interface PluginHost {
  readonly meta: { id: string; version: string };
  readonly ai: PluginAIApi;
  readonly memory: PluginMemoryApi;
  readonly tabs: PluginTabsApi;
  readonly automation: PluginAutomationApi;
  readonly ui: PluginUiApi;
  readonly commands: PluginCommandsApi;
  readonly storage: PluginStorageApi;
  readonly net: PluginNetApi;
  readonly events: PluginEventsApi;
}

export interface PluginAIApi {
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  stream(request: AICompletionRequest): AsyncIterable<{ delta: string }>;
}

export interface PluginMemoryApi {
  save(input: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt" | "embedding">): Promise<MemoryRecord>;
  search(query: { text?: string; limit?: number }): Promise<MemoryRecord[]>;
}

export interface PluginTabsApi {
  list(): Promise<Tab[]>;
  current(): Promise<Tab | undefined>;
  open(url: string, options?: { background?: boolean }): Promise<Tab>;
  navigate(tabId: string, url: string): Promise<void>;
}

export interface PluginAutomationApi {
  create(definition: unknown): Promise<{ id: string }>;
}

export interface PluginUiApi {
  registerSidebarPanel(panel: {
    id: string;
    title: string;
    render: () => string | { html: string };
  }): void;
  registerSetting(setting: { id: string; label: string; type: "string" | "boolean" | "number"; default: unknown }): void;
}

export interface PluginCommandsApi {
  register(command: {
    id: string;
    title: string;
    keywords?: string[];
    run: () => void | Promise<void>;
  }): void;
}

export interface PluginStorageApi {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PluginNetApi {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export interface PluginEventsApi {
  on(event: string, handler: (payload: unknown) => void): () => void;
}

/** Plugin entry-point signature. */
export type PluginActivate = (host: PluginHost) => Promise<void> | void;
