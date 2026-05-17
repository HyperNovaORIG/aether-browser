import path from "node:path";
import { app, type BrowserWindow } from "electron";
import {
  AIOrchestrator,
  AnthropicProvider,
  EchoProvider,
  ModelRouter,
  OllamaProvider,
  OpenAIProvider,
} from "@aether/ai-core";
import { MemoryStore, InMemoryPersistence } from "@aether/memory";
import {
  AgentRuntime,
  AutomationAgent,
  CodingAgent,
  ResearchAgent,
  SecurityAgent,
  ShoppingAgent,
  TravelAgent,
} from "@aether/agents";
import { AutomationScheduler } from "@aether/automation";
import { PluginRegistry } from "@aether/plugin-sdk";
import { globalBus } from "@aether/event-bus";
import type { AetherEventName } from "@aether/event-bus";
import type { ProfileManager } from "./profile";
import type { TabManager } from "./tab-manager";
import { JsonFilePersistence } from "./memory-persistence";

export interface AppContainer {
  window: BrowserWindow;
  tabManager: TabManager;
  profileManager: ProfileManager;
  ai: AIOrchestrator;
  router: ModelRouter;
  memory: MemoryStore;
  agents: AgentRuntime;
  automation: AutomationScheduler;
  plugins: PluginRegistry;
}

const FORWARDED_EVENTS: AetherEventName[] = [
  "tab:created",
  "tab:updated",
  "tab:closed",
  "tab:activated",
  "tab:navigated",
  "tab:summary",
  "workspace:created",
  "workspace:switched",
  "workspace:deleted",
  "ai:chunk",
  "ai:done",
  "ai:error",
  "agent:task-created",
  "agent:task-updated",
  "agent:task-completed",
  "memory:saved",
  "memory:deleted",
  "plugin:installed",
  "plugin:uninstalled",
  "automation:triggered",
  "automation:completed",
];

/**
 * Dependency injection container — wires every subsystem and exposes them to
 * the IPC layer. The container is the only place where concrete provider
 * instances are constructed; the rest of the codebase is parameterised.
 */
export function createApp(args: {
  window: BrowserWindow;
  tabManager: TabManager;
  profileManager: ProfileManager;
}): AppContainer {
  const userData = app.getPath("userData");

  /* AI ------------------------------------------------------------- */
  const router = new ModelRouter([
    new OpenAIProvider(),
    new AnthropicProvider(),
    new OllamaProvider(),
    new EchoProvider(),
  ]);
  const ai = new AIOrchestrator({ router });

  /* Memory --------------------------------------------------------- */
  const persistence = new JsonFilePersistence(path.join(userData, "aether-memory.json")) ?? new InMemoryPersistence();
  const memory = new MemoryStore({ persistence });

  /* Agents --------------------------------------------------------- */
  const agents = new AgentRuntime([
    new ResearchAgent({
      ai,
      memory,
      search: async () => [],
    }),
    new CodingAgent({ ai }),
    new ShoppingAgent({ ai }),
    new SecurityAgent({ ai }),
    new TravelAgent({ ai }),
    new AutomationAgent({ ai }),
  ]);

  /* Automation ----------------------------------------------------- */
  const automation = new AutomationScheduler({
    handlers: {
      "open-tab": async ({ url }) => {
        args.tabManager.create({ url });
      },
      notify: async () => {
        /* surfaced via global bus → renderer */
      },
    },
  });
  automation.start();

  /* Plugins -------------------------------------------------------- */
  const plugins = new PluginRegistry();

  /* Forward bus events to the renderer ---------------------------- */
  for (const name of FORWARDED_EVENTS) {
    globalBus().on(name, (payload) => {
      if (!args.window.isDestroyed()) {
        args.window.webContents.send(`bus:${name}`, payload);
      }
    });
  }

  return {
    window: args.window,
    tabManager: args.tabManager,
    profileManager: args.profileManager,
    ai,
    router,
    memory,
    agents,
    automation,
    plugins,
  };
}
