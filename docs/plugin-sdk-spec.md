# Aether Plugin SDK

Aether plugins are sandboxed JavaScript bundles that extend the browser with
new commands, sidebar panels, agents, automations and AI providers. Plugins
declare their capabilities up front; the user grants them, and the host
enforces them at every call.

## Manifest

Every plugin ships a manifest validated by
`PluginManifestSchema` (`@aether/shared/schemas.ts`):

```json
{
  "id": "plg_translate",
  "name": "Smart Translate",
  "version": "1.0.0",
  "description": "Inline translation with context awareness.",
  "author": { "name": "Aether Labs", "url": "https://aether.app" },
  "entry": "./dist/index.js",
  "capabilities": ["ai", "tabs.read", "tabs.write", "ui.sidebar", "ui.command", "memory.read"],
  "uiSurfaces": ["sidebar", "command-palette", "context-menu"],
  "minAetherVersion": "0.1.0"
}
```

### Capability vocabulary

| Capability | Grants |
|---|---|
| `tabs.read`        | List, query, observe tabs and their summaries |
| `tabs.write`       | Create, close, navigate, group tabs |
| `memory.read`      | Search memory; only sees the plugin's scope by default |
| `memory.write`     | Save / delete memory in the plugin's scope |
| `ai`               | Call `host.ai.complete` / `host.ai.stream` |
| `automation`       | Define and trigger automations |
| `net`              | `fetch` arbitrary URLs (host enforces allow-list per-origin) |
| `clipboard`        | Read/write clipboard |
| `download`         | Save files to user-chosen path |
| `notifications`    | OS notifications (rate-limited) |
| `ui.sidebar`       | Register a sidebar panel |
| `ui.command`       | Register Cmd+K commands |
| `ui.toolbar`       | Add toolbar action |
| `ui.context-menu`  | Add page context-menu items |
| `system.shell`     | (Enterprise only) Execute approved shell command |

Capabilities are deny-by-default. The user sees a clear, human readable list
when installing.

## Entry point

```ts
// dist/index.js
import type { PluginActivate } from "@aether/plugin-sdk";

const activate: PluginActivate = async (host) => {
  host.commands.register({
    id: "translate-page",
    title: "Translate this page",
    keywords: ["перевести", "translate", "i18n"],
    run: async () => {
      const tab = await host.tabs.current();
      if (!tab) return;
      const memory = await host.memory.search({ text: tab.url, limit: 1 });
      const language = (await host.storage.get<string>("targetLang")) ?? "en";
      const response = await host.ai.complete({
        capability: "translate",
        messages: [
          { role: "system", content: `Translate to ${language}. Preserve markdown.` },
          { role: "user", content: memory[0]?.text ?? tab.title },
        ],
      });
      host.ui.registerSidebarPanel({
        id: "translate-result",
        title: "Translation",
        render: () => ({ html: `<pre>${response.content}</pre>` }),
      });
    },
  });
};

export default activate;
```

## Lifecycle

```
                ┌─────────┐
                │ install │ -- user grants capabilities
                └────┬────┘
                     ▼
                ┌─────────┐
                │ activate│ -- exported default function runs
                └────┬────┘
                     ▼
                ┌─────────┐
                │ running │ -- handles commands, panels, events
                └────┬────┘
                     ▼
                ┌─────────┐
                │deactivate│ -- on disable / uninstall / app quit
                └─────────┘
```

`PluginRegistry` (in `@aether/plugin-sdk/registry`) owns the lifecycle in
the main process; the actual plugin code is loaded inside a dedicated
`utilityProcess` so a malfunctioning plugin can never crash Aether.

## Distribution

- v1: install from a local `.aether-plugin` directory or a verified URL.
- v2: signed plugins distributed via the Aether marketplace.

Signed plugins ship a `signature.json` containing an Ed25519 signature of
the manifest + entry script. Verification keys are stored in the user's
trust store; the user is prompted on first install from an unknown key.

## Inter-plugin communication

Plugins can fire events on the shared event bus (`host.events.on/emit`)
under their own namespace `plugin:<id>:<event>`. Cross-plugin listeners are
allowed but get a redacted payload (no PII) unless both plugins opt in via
their manifests.

## Reference: built-in plugins

These ship as plugins to dogfood the SDK:

- **Translate** — inline translation + auto-detect.
- **Read Mode** — Mercury-style article view.
- **AI Highlight** — explain selected text.
- **Price Tracker** — uses the Shopping Agent + a cron automation.
- **Code Block Run** — `eval` code blocks in a sandboxed iframe.

## Roadmap

- Streaming output API (`host.ai.stream` is in MVP).
- Long-lived background workers (Pro).
- WebAssembly plugin runtime (Enterprise).
