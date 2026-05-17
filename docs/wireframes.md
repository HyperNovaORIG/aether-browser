# Aether Wireframes

Lo-fi wireframes for the MVP. Pixel-perfect Figma artefacts live in
`design/` (separate repo); this document captures the structural intent so
any front-end engineer can rebuild from text alone.

## Main window

```
╔═════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  ┌────────────┐  ┌──◀ ▶ ⟳  https://… ──── lock 🔒  sparkles ✨─┐ ┌──────┐║
║  │ ✨ Aether  │  │                                              │ │ Chat │║
║  │ v0.1 · MVP │  └──────────────────────────────────────────────┘ │ Agnt │║
║  ├────────────┤                                                   │ Mem  │║
║  │ Discover   │                                                   ├──────┤║
║  │ Library    │                                                   │      │║
║  │ Auto       │            ┌──────────────────────────┐           │ Ctx: │║
║  │ Workspaces │            │                          │           │ tab… │║
║  ├──PINNED────┤            │     BrowserView          │           │      │║
║  │ ● Linear   │            │     (native composited)  │           │ ─── │║
║  │ ● Notion   │            │                          │           │ Bubbles ║
║  ├──TABS─ + ──┤            │                          │           │      │║
║  │ • The Verg │            │                          │           │      │║
║  │ • Aether…  │            │                          │           │      │║
║  │ • Localhos │            │                          │           │      │║
║  │ • New Tab  │            │                          │           │ ───  │║
║  ├────────────┤            │                          │           │ [Ask…│║
║  │  Search ⌘K │            │                          │           │      │║
║  │  Settings  │            │                          │           │      │║
║  └────────────┘            └──────────────────────────┘           └──────┘║
║                                                                          ║
╚═════════════════════════════════════════════════════════════════════════╝
   ← 260 →   ←──────────────  flex  ──────────────→   ←─── 380 ───→
```

## Tab rail anatomy

- Brand row at top (drag region).
- Static nav (Discover, Library, Automations, Workspaces).
- Pinned tabs (always visible).
- Tabs section with `+` for new tab.
- Search + Settings pinned to bottom.

## Toolbar

- 3 round buttons (back, forward, reload).
- Smart address bar: lock + URL/query + AI quick action.
- Right cluster: Shield, Bookmark.

## AI sidebar

Three sub-tabs at top: Chat / Agents / Memory.

### Chat
- Context strip showing the active tab.
- Bubbles list with streaming caret.
- Composer: textarea + reset + send (gradient send button when valid).
- Footer hint: `⌘↩ to send · Shift+↩ for newline · Sources persist to memory`.

### Agents
- 2-column grid of agent cards (icon, name, description).
- Tasks list with progress bars and status pills.

### Memory
- Privacy explainer.
- Bullet list of controls (pin, wipe, replay).
- Promo card for Private Mode.

## Command palette

- Opens on ⌘K.
- Full-screen scrim with blur (`bg-ink-900/70 backdrop-blur-sm`).
- Centered card 640 px wide.
- Search field with placeholder "Type a command, ask AI, or search…".
- Categorised results, with kind tag on the right (`COMMAND`, `TAB`, `AGENT`, `AI`).
- Footer hint: `↑↓ to navigate · ↩ to run`.

## Empty states

- New tab: gradient logo + 3 suggested prompts ("Summarise this page",
  "Compare top 3 alternatives", "Draft a reply").
- Agents: copy explaining what agents are with a "Run your first agent"
  CTA.
- Memory: copy explaining privacy + pin/wipe/replay bullets.

## Motion

- Tab rail rows: `motion.layout` with `spring`.
- AI Sidebar tab switch: `slideRight` with `spring`.
- Command palette: scale-up + fade-in with `spring`.
- Streaming caret: `animate-breathe`.
