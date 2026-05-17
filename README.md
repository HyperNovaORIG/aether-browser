# Aether Browser

> AI-native browser for power users, founders, developers, researchers and creators.
> The operating system for the internet of the future.

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()
[![Node](https://img.shields.io/badge/node-%E2%89%A520.10-brightgreen)]()
[![Status](https://img.shields.io/badge/status-MVP-orange)]()

Aether is not just a browser — it is a full AI operating environment for the
internet. Premium UI inspired by Apple / Linear / Arc / Notion / Raycast,
glassmorphism, spring-physics animations, keyboard-first UX, and a
production-grade modular architecture built around an AI orchestration layer,
multi-agent framework, encrypted memory and a plugin SDK.

---

## Highlights

- **AI Sidebar** with streaming responses, multi-provider routing
  (OpenAI / Anthropic / Ollama), tab-aware context.
- **Multi-Agent System** — Research, Coding, Shopping, Security, Travel and
  Automation agents that can run in parallel and exchange context.
- **AI Tabs** — every tab has memory, history, summary and semantic search.
- **Cmd+K Command Palette** with natural-language actions.
- **Workspaces** — isolated profiles, shared sessions, AI dashboards.
- **Encrypted Memory** with editable timeline and full user control.
- **Plugin SDK** with capability-based permissions and a marketplace.
- **Automation** — visual workflows, cron, browser macros.
- **Privacy by default** — local AI mode, tracker blocking,
  anti-fingerprinting, sandboxed AI execution.

See [`docs/`](./docs) for the full architecture, design system, roadmap,
plugin SDK, agent framework, monetization, launch strategy and more.

---

## Monorepo layout

```
aether-browser/
├── apps/
│   └── desktop/          # Electron + React renderer
├── packages/
│   ├── ai-core/          # AI orchestration, providers, model router
│   ├── agents/           # Multi-agent framework
│   ├── memory/           # Encrypted SQLite + vector memory
│   ├── plugin-sdk/       # Plugin SDK and manifest spec
│   ├── event-bus/        # Typed event bus
│   ├── automation/       # Cron, workflows, macros
│   ├── ui/               # Shared UI primitives and design tokens
│   └── shared/           # Shared types, schemas and utilities
├── services/
│   └── ai-gateway/       # Python FastAPI microservice (heavy AI tasks)
└── docs/                 # Architecture, design, specs, roadmaps
```

## Quick start

Requirements: **Node ≥ 20.10**, **pnpm ≥ 9**, **Python ≥ 3.11**.

```bash
pnpm install
pnpm build            # build all packages
pnpm --filter @aether/desktop dev   # run the Electron app in dev mode
```

To run the optional AI gateway:

```bash
cd services/ai-gateway
pip install -e .
uvicorn aether_gateway.main:app --reload
```

Environment variables (optional — Ollama works without keys):

```bash
export OPENAI_API_KEY=...
export ANTHROPIC_API_KEY=...
export OLLAMA_BASE_URL=http://127.0.0.1:11434
```

## Documentation

| Document | Description |
| --- | --- |
| [`docs/architecture.md`](./docs/architecture.md) | High-level system architecture |
| [`docs/design-system.md`](./docs/design-system.md) | Design tokens, components, motion |
| [`docs/ai-orchestration.md`](./docs/ai-orchestration.md) | Model router, providers, streaming |
| [`docs/agent-framework.md`](./docs/agent-framework.md) | Multi-agent runtime |
| [`docs/memory-system.md`](./docs/memory-system.md) | Encrypted memory + vector store |
| [`docs/plugin-sdk-spec.md`](./docs/plugin-sdk-spec.md) | Plugin manifest, APIs, permissions |
| [`docs/security-model.md`](./docs/security-model.md) | Threat model, sandboxing, crypto |
| [`docs/db-schema.md`](./docs/db-schema.md) | SQLite schema |
| [`docs/api-contracts.md`](./docs/api-contracts.md) | IPC + HTTP contracts |
| [`docs/mvp-scope.md`](./docs/mvp-scope.md) | MVP scope and acceptance criteria |
| [`docs/roadmap.md`](./docs/roadmap.md) | 0 → 12 month roadmap |
| [`docs/enterprise-roadmap.md`](./docs/enterprise-roadmap.md) | Team / Enterprise tier |
| [`docs/scaling-plan.md`](./docs/scaling-plan.md) | Infra and scaling |
| [`docs/monetization.md`](./docs/monetization.md) | Pricing, plans, marketplace |
| [`docs/launch-strategy.md`](./docs/launch-strategy.md) | GTM, distribution, growth |
| [`docs/wireframes.md`](./docs/wireframes.md) | Key screens (ASCII wireframes) |

## License

This MVP is released under the AGPL-3.0 license. Future commercial editions
(Team / Enterprise / Marketplace) may be dual-licensed.
