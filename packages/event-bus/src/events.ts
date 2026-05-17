import type {
  AgentTask,
  Tab,
  TabId,
  Workspace,
  WorkspaceId,
  AutomationWorkflow,
  PluginManifest,
  MemoryRecord,
} from "@aether/shared";

/**
 * Domain events emitted on the global event bus. Names follow `domain:verb`
 * with the past tense (e.g. `tab:created`). All payloads must be
 * structured-cloneable so they can cross the Electron IPC boundary.
 */
export interface AetherEventMap {
  /* Tabs --------------------------------------------------------------- */
  "tab:created": { tab: Tab };
  "tab:updated": { tabId: TabId; changes: Partial<Tab> };
  "tab:closed": { tabId: TabId };
  "tab:activated": { tabId: TabId };
  "tab:navigated": { tabId: TabId; url: string };
  "tab:summary": { tabId: TabId; summary: string };

  /* Workspaces -------------------------------------------------------- */
  "workspace:created": { workspace: Workspace };
  "workspace:switched": { workspaceId: WorkspaceId };
  "workspace:deleted": { workspaceId: WorkspaceId };

  /* AI ---------------------------------------------------------------- */
  "ai:request": { conversationId: string; prompt: string };
  "ai:chunk": { conversationId: string; delta: string };
  "ai:done": { conversationId: string };
  "ai:error": { conversationId: string; code: string; message: string };

  /* Agents ------------------------------------------------------------ */
  "agent:task-created": { task: AgentTask };
  "agent:task-updated": { task: AgentTask };
  "agent:task-completed": { task: AgentTask };

  /* Memory ------------------------------------------------------------ */
  "memory:saved": { record: MemoryRecord };
  "memory:deleted": { memoryId: string };

  /* Plugins ----------------------------------------------------------- */
  "plugin:installed": { manifest: PluginManifest };
  "plugin:uninstalled": { pluginId: string };

  /* Automation -------------------------------------------------------- */
  "automation:triggered": { workflow: AutomationWorkflow };
  "automation:completed": { workflowId: string; ok: boolean };

  /* App lifecycle ----------------------------------------------------- */
  "app:ready": Record<string, never>;
  "app:before-quit": Record<string, never>;
}

export type AetherEventName = keyof AetherEventMap;
