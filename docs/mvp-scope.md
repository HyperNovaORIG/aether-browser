# MVP Scope

This document captures what is in / out for the first shippable Aether
release, the one this repository builds.

## In scope

### Browser core

- Electron 31 main process with hardened defaults.
- BrowserView-based tab manager.
- Profile + session partition isolation (single default profile on first run).
- Toolbar: back/forward/reload + smart address bar (URL or NL → DuckDuckGo).
- Vertical tab rail with smooth animations.
- Per-tab loading/favicon/title updates.
- Window controls compatible with macOS, Windows and Linux native chrome.

### AI

- Multi-provider router (OpenAI, Anthropic, Ollama, Echo).
- Capability-based selection (chat, summarize, code, research, vision,
  embedding, etc.).
- Streaming chat in the AI sidebar.
- Context builder (active tab, workspace, pinned memories).

### Memory

- In-memory + JSON-on-disk store.
- Keyword + semantic search via HashingEmbedder.
- Tags, pinning, TTL, scopes.
- AES-256-GCM crypto module (used by Beta when SQLCipher lands).

### Agents

- AgentRuntime with bounded concurrency.
- Six agent scaffolds (Research, Coding, Shopping, Security, Travel, Automation).
- Streaming logs, progress, artifacts, citations.

### Plugin SDK

- Manifest schema, validation, registry.
- Capability vocabulary + PermissionSet.
- PluginHost API surface (no execution sandbox yet — comes in Beta).

### Automation

- Cron parser (5-field).
- Scheduler with bounded concurrency.
- Step executor with pluggable handlers.

### Renderer / UX

- React 18 + Vite + Tailwind 3.4 + Framer Motion 11.
- Glassmorphism design system with named tokens.
- Smart Command Palette (⌘K) over commands, tabs, agents, AI.
- AI Sidebar with three tabs: Chat / Agents / Memory.
- Keyboard-first navigation.

### Docs

- All 15 architecture deliverables under `docs/`.

## Explicitly out of scope (deferred to Beta+)

- SQLite + sqlite-vss vector index (in-memory only for MVP).
- True plugin sandbox via `utilityProcess` (registry only for MVP).
- Visual workflow builder for automations.
- Live cursors / collaboration / shared sessions.
- Telemetry pipeline (events emitted but not exported).
- Voice / screen capture / multi-window canvas.
- Anti-fingerprinting + tracker blocking lists.
- Encrypted sync (we ship local persistence only).
- Auto-updater integration.
- Public plugin marketplace.
- Notarisation + code-signing CI.

## Definition of done (MVP)

- `pnpm install` succeeds on macOS, Windows and Linux.
- `pnpm typecheck` is green across all packages.
- `pnpm lint` is green across all packages.
- `pnpm dev` launches Aether, opens a window with the chrome rendered.
- A new tab can be created, navigated, closed.
- The AI sidebar streams a response from the Echo provider.
- Cmd+K opens, filters and runs commands.
