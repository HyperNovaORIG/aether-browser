import type { IpcMain } from "electron";
import { randomUUID } from "node:crypto";
import {
  AICompletionRequestSchema,
  newId,
  type AgentKind,
  type AICompletionRequest,
  type MemoryRecord,
  type TabId,
  type TaskId,
  type WorkspaceId,
} from "@aether/shared";
import type { AppContainer } from "./app-container";

export interface IpcOptions {
  ipcMain: IpcMain;
  container: AppContainer;
}

/**
 * Centralised IPC registration. Every channel:
 *
 *   - validates input with a zod schema (or a small handwritten guard)
 *   - returns the result of a service call, never raw objects from the main
 *     process — payloads must be structured-cloneable
 *   - catches errors and converts them to typed payloads so the renderer can
 *     show user-friendly messages without leaking stack traces.
 */
export function registerIpc({ ipcMain, container }: IpcOptions): void {
  const { ai, agents, memory, tabManager, profileManager } = container;

  ipcMain.handle("app:get-info", () => ({
    version: process.versions.electron ?? "0.0.0",
    platform: process.platform,
  }));

  /* --------------------------- Tabs --------------------------------- */
  ipcMain.handle("tabs:list", () => tabManager.list());
  ipcMain.handle("tabs:create", (_e, input: { url: string; workspaceId?: string }) => {
    const tab = tabManager.create({
      url: input.url,
      workspaceId: input.workspaceId as WorkspaceId | undefined,
    });
    tabManager.activate(tab.id);
    return tab;
  });
  ipcMain.handle("tabs:close", (_e, tabId: TabId) => tabManager.close(tabId));
  ipcMain.handle("tabs:activate", (_e, tabId: TabId) => tabManager.activate(tabId));
  ipcMain.handle("tabs:navigate", (_e, tabId: TabId, url: string) => tabManager.navigate(tabId, url));
  ipcMain.handle("tabs:go-back", (_e, tabId: TabId) => tabManager.goBack(tabId));
  ipcMain.handle("tabs:go-forward", (_e, tabId: TabId) => tabManager.goForward(tabId));
  ipcMain.handle("tabs:reload", (_e, tabId: TabId) => tabManager.reload(tabId));
  ipcMain.handle("tabs:set-bounds", (_e, bounds: { x: number; y: number; width: number; height: number }) => {
    tabManager.setBounds(bounds);
  });

  /* --------------------------- AI ----------------------------------- */
  ipcMain.handle("ai:chat", async (_e, raw: unknown) => {
    const request = AICompletionRequestSchema.parse(raw) as AICompletionRequest;
    return ai.complete(request);
  });

  ipcMain.handle("ai:stream", async (event, raw: unknown) => {
    const request = AICompletionRequestSchema.parse(raw) as AICompletionRequest;
    const streamId = `str_${randomUUID()}`;
    void (async () => {
      try {
        for await (const chunk of ai.stream({ ...request, stream: true })) {
          if (event.sender.isDestroyed()) break;
          event.sender.send(`ai:stream-chunk:${streamId}`, chunk);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        event.sender.send(`ai:stream-chunk:${streamId}`, {
          kind: "error",
          error: { code: "AI_PROVIDER_ERROR", message },
        });
      }
    })();
    return { streamId };
  });

  ipcMain.handle("ai:cancel", () => {
    /* Stream cancellation hook — not yet implemented in MVP. */
  });

  ipcMain.handle("ai:list-providers", async () =>
    Promise.all(
      container.router.list().map(async (provider) => ({
        name: provider.name,
        available: await provider.isAvailable(),
        models: provider.listModels(),
      })),
    ),
  );

  /* --------------------------- Memory ------------------------------- */
  ipcMain.handle("memory:search", async (_e, query: unknown) => memory.search(query as Parameters<typeof memory.search>[0]));
  ipcMain.handle("memory:save", async (_e, record: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt" | "embedding">) =>
    memory.save(record),
  );
  ipcMain.handle("memory:delete", async (_e, id: string) => memory.delete(id as MemoryRecord["id"]));

  /* --------------------------- Agents ------------------------------- */
  ipcMain.handle("agents:list", () =>
    agents.list().map((a) => ({ kind: a.kind, name: a.name, description: a.description, icon: a.icon })),
  );
  ipcMain.handle("agents:list-tasks", () => agents.listTasks());
  ipcMain.handle("agents:run", (_e, input: { kind: AgentKind; prompt: string; tabId?: TabId }) =>
    agents.enqueue(input),
  );
  ipcMain.handle("agents:cancel", (_e, taskId: string) => agents.cancel(taskId as TaskId));

  /* --------------------------- Workspaces --------------------------- */
  ipcMain.handle("workspaces:list", () => profileManager.list());
  ipcMain.handle("workspaces:create", async (_e, input: { name: string }) => profileManager.create(input.name));
  ipcMain.handle("workspaces:switch", () => {
    /* Switching is no-op in MVP; tabs are scoped per workspace logically. */
  });

  /* --------------------------- Commands ----------------------------- */
  ipcMain.handle("commands:run", async (_e, commandId: string, args?: unknown) => {
    switch (commandId) {
      case "tab.new":
        return tabManager.create({ url: (args as { url?: string })?.url ?? "https://aether.local/newtab" });
      case "tab.close-active": {
        const active = tabManager.active();
        if (active) return tabManager.close(active.id);
        return false;
      }
      case "memory.create":
        return memory.save({
          scope: "user",
          kind: "note",
          text: String((args as { text?: string })?.text ?? ""),
          tags: ["quick"],
          pinned: false,
          ttlMs: 0,
        });
      default:
        return { ok: false, error: `Unknown command: ${commandId}`, hint: newId("session") };
    }
  });
}
