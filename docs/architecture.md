# Aether Architecture

> "Aether is an AI-native operating environment for the internet."

This document describes the runtime architecture of Aether — the processes, the
modules they own, and how data and events flow between them.

## High-level diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Aether Desktop                              │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐ │
│  │   Renderer (React)   │   │      Electron main process (Node)        │ │
│  │  - Tab rail          │   │  - Tab manager (BrowserView)             │ │
│  │  - Toolbar           │◀──▶  - Profile + session isolation           │ │
│  │  - AI sidebar        │IPC│  - Secure preload bridge                 │ │
│  │  - Cmd+K palette     │   │  - DI container                          │ │
│  │  - Agent panel       │   │  - IPC router + zod validation           │ │
│  └──────────────────────┘   └─┬────────────────────────────────────────┘ │
│                                │                                          │
│                                ▼                                          │
│        ┌──────────────────────────────────────────────┐                  │
│        │  Shared packages (monorepo)                  │                  │
│        │  - @aether/shared      (types, ids, errors)  │                  │
│        │  - @aether/event-bus   (typed pub/sub)       │                  │
│        │  - @aether/ai-core     (orchestrator)        │                  │
│        │  - @aether/memory      (vector + KV store)   │                  │
│        │  - @aether/agents      (Agent runtime)       │                  │
│        │  - @aether/automation  (cron + workflows)    │                  │
│        │  - @aether/plugin-sdk  (capability API)      │                  │
│        │  - @aether/ui          (design tokens)       │                  │
│        └──────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                            HTTP (localhost only)
                                    ▼
                  ┌──────────────────────────────────────┐
                  │   Python AI Gateway (FastAPI)        │
                  │   - PDF / video summarisation        │
                  │   - Whisper transcription            │
                  │   - Browser-based scraping           │
                  │   - Bulk embeddings + reranking      │
                  └──────────────────────────────────────┘
```

## Process model

Aether runs three classes of process at most:

1. **Main process** (Electron, Node 20+) — owns the BrowserView tab manager,
   secure session, IPC layer and DI container.
2. **Renderer** (Chromium) — owns the chrome (vertical tabs, toolbar, sidebar,
   command palette). Strictly sandboxed:
   - `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`
   - Only `window.aether.*` (preload bridge) crosses the boundary
   - All IPC is `invoke/handle` with zod validation
3. **Optional AI gateway** (Python) — heavy AI workloads that aren't a fit
   for Node (PDF parsing, Whisper, headless scraping).

Each browser page lives in its own Chromium renderer, isolated by a per-profile
`session.partition` (`persist:prf_*`). Switching profiles switches sessions —
no cookie or service-worker bleed-over.

## Why Electron, not Tauri?

| Concern | Electron | Tauri |
|---|---|---|
| Chromium parity | Native | Uses host webview |
| Multi-tab `BrowserView` | First-class | Manual & immature |
| Node SDKs | Yes | Limited (no Node runtime) |
| Bundle size | ~120 MB | ~10 MB |
| Memory | Higher | Lower |

A browser must ship a consistent Chromium across macOS/Win/Linux. Tauri's
webview defers to whatever the host OS bundles (Edge WebView2, WKWebView,
WebKitGTK), which is the opposite of what a browser product needs. We pay the
binary-size tax now and revisit when Tauri ships a multi-window Chromium
runtime.

## Module ownership

| Subsystem | Package | Owner |
|---|---|---|
| Types, IDs, errors, schemas | `@aether/shared` | Platform |
| Typed event bus | `@aether/event-bus` | Platform |
| Multi-provider AI router | `@aether/ai-core` | AI |
| Vector + keyword memory | `@aether/memory` | AI |
| Multi-agent runtime | `@aether/agents` | AI |
| Plugin manifest, perms, registry | `@aether/plugin-sdk` | Platform |
| Cron + workflow executor | `@aether/automation` | Platform |
| Design tokens, motion presets | `@aether/ui` | Design |
| Electron main, IPC, BrowserView | `apps/desktop/electron` | Platform |
| React renderer | `apps/desktop/src` | Design + Product |
| Python heavy lifters | `services/ai-gateway` | AI |

## Event flow

A typical "summarise this tab" interaction:

```
[Renderer]  user submits in AI sidebar
   │   invoke("ai:stream", request)
   ▼
[Main]    IpcRouter validates request with zod
   │   AIOrchestrator.stream(req)
   ▼
[ai-core] ModelRouter picks provider+model for capability="chat"
   │   OpenAI/Anthropic/Ollama/Echo
   ▼
[Main]    each chunk → emit `ai:chunk` on globalBus
   │   forward `ai:chunk` → renderer via `bus:ai:chunk`
   ▼
[Renderer]  useAIStore.send appends streaming delta to chat
```

All cross-module communication goes through the typed event bus. The renderer
never receives a raw object that wasn't first shaped by a TypeScript type in
`@aether/shared`.

## Security

See [security-model.md](./security-model.md). Highlights:

- **Sandboxed renderers** with no Node access.
- **Per-profile session** isolation, with `webPreferences.partition`.
- **Capability-based** plugins; users grant capabilities, not "permissions".
- **No `remote` module**; all IPC is `invoke/handle`.
- **Encrypted at rest** memory via AES-256-GCM (key from `safeStorage`).
- **CSP**: only `'self'` + the trusted API hosts; no `unsafe-eval`.
- **Anti-fingerprinting** + tracker block list (post-MVP).
- **Local AI mode** disables outbound provider calls entirely.

## Performance principles

- **Don't block the main process.** All AI streaming is async, all heavy
  compute lives in `ai-gateway`.
- **Each BrowserView is a tab.** Switching tabs is `addBrowserView` /
  `removeBrowserView` — never reload.
- **Renderer cost is bounded** with Zustand selectors and `motion.layout`.
- **Embeddings default to local** (`HashingEmbedder`) so we never block on
  a network call.
- **Memory budget** for a single AI message is capped at 16 KB context after
  truncation in `@aether/ai-core/context.ts`.

## Offline-first

Aether degrades gracefully:

| Connection | Behaviour |
|---|---|
| Online + API keys | Cloud providers, full quality |
| Online, no keys | Ollama (if running), else Echo provider |
| Offline | Ollama or Echo; cached embeddings and memory |
| Air-gapped | Local-only mode forces Ollama + disables network calls |

The model router treats availability as a first-class signal — see
[ai-orchestration.md](./ai-orchestration.md).
