# Aether Agent Framework

Agents are long-running, autonomous workers that browse, reason, summarise
and act on the user's behalf. The MVP ships six scaffolds; the framework is
designed for many more.

## Anatomy of an agent

```ts
class ResearchAgent extends Agent {
  readonly kind = "research";
  readonly name = "Research Agent";
  readonly description = "Deep web research with citations.";
  readonly icon = "search";

  constructor(private deps: { ai, memory, search }) { super(); }

  async run(ctx: AgentContext): Promise<AgentRunOutcome> {
    this.log(ctx, "info", "Planning research");
    // 1) Decompose
    // 2) Search & summarise
    // 3) Synthesize
    return { summary, artifacts, citations };
  }
}
```

Each agent exports:

- `kind` — discriminated union from `AgentKind`.
- `name`, `description`, `icon` — used in the UI gallery.
- `run(ctx)` — main loop.

`AgentContext` exposes the prompt, workspace, current tab, an `AbortSignal`
for cooperative cancellation, and an `emit` callback for streaming logs /
artifacts / citations / progress to the renderer.

## Runtime

`AgentRuntime` is a bounded-concurrency scheduler:

- Concurrency cap (default 4) prevents thundering herd against providers.
- Tasks are dispatched in FIFO order, but priority queues can be added.
- Status transitions broadcast on the global event bus (`agent:task-*`),
  forwarded to the renderer for live UI updates.
- Cancellation is cooperative: each agent must check `ctx.signal.aborted`
  at safe interruption points (between API calls, between loop iterations).

## Six initial agents

| Agent | Purpose | Capabilities |
|---|---|---|
| **Research** | Multi-step web research with citations | `ai`, `net`, `memory.write` |
| **Coding** | Explain code, generate snippets, refactor | `ai` |
| **Shopping** | Compare products, surface deals | `ai`, `net` |
| **Security** | Audit pages for risk | `ai`, `tabs.read` |
| **Travel** | Plan trips and itineraries | `ai`, `net` |
| **Automation** | Convert NL → runnable workflow | `ai`, `automation` |

## Inter-agent collaboration (post-MVP)

Agents will communicate via the same event bus by emitting structured
`agent:request` events that other agents subscribe to. Each agent that
opts in declares its `provides:` and `consumes:` topics.

Example flow:

```
ResearchAgent  ──"agent:request:summarize"──▶  CodingAgent (if code-heavy)
                                          └──▶  ShoppingAgent (if prices)
```

A meta-agent (`AutopilotAgent`) coordinates multi-agent runs by maintaining
a shared scratchpad in memory and dispatching subtasks.

## Reliability

- Each `run` is wrapped in a try/catch that records the failure in `logs`
  and surfaces it via `agent:task-updated`.
- Long-running steps must call `progress(value)` so the UI bar advances.
- Network calls go through the AI router which already retries with
  exponential backoff (3 attempts, max 4 s).
- Agents never persist state outside `MemoryStore`. This is what makes
  them resumable, replayable and inspectable.

## Telemetry

Agents emit anonymised structured logs (`agent:task-updated → logs`) only.
No content of the user's prompt or AI response is included in telemetry
unless the user has explicitly opted in to crash reports.
