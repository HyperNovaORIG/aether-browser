# Aether AI Orchestration

`@aether/ai-core` is the brain of Aether. It abstracts over multiple AI
providers, picks the right model for each task, streams responses to the
renderer, and degrades gracefully when providers are unavailable.

## Components

```
                    AICompletionRequest
                          │
                          ▼
                  ┌───────────────┐
                  │ AIOrchestrator│  (public API)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  ModelRouter  │  (capability-based)
                  └───────┬───────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   OpenAIProvider   AnthropicProvider   OllamaProvider  ...  EchoProvider
```

## Provider contract

Every provider implements `AIProvider`:

```ts
interface AIProvider {
  readonly name: AIProviderName;
  listModels(): AIModelDescriptor[];
  isAvailable(): Promise<boolean>;
  complete(req: AICompletionRequest): Promise<AICompletionResponse>;
  stream(req: AICompletionRequest): AsyncIterable<AICompletionChunk>;
  embed?(text: string, model?: string): Promise<number[]>;
}
```

Adding a new provider is a single file in `packages/ai-core/src/providers/`
plus a registration entry in `apps/desktop/electron/app-container.ts`.

## Model catalogue

`models.ts` enumerates every model the orchestrator can route to. Each
descriptor carries capabilities, context window, cost-per-1K and latency
hint. The router uses these as signals.

```ts
{
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  capabilities: ["chat", "summarize", "code", "research", "vision"],
  contextWindow: 200_000,
  costPer1KInput: 0.003,
  costPer1KOutput: 0.015,
  latencyHintMs: 1100,
  offline: false,
}
```

## Routing

```
router.route(capability, modelHint?) →
  1. If modelHint matches any provider's model list → return it
  2. Filter providers to available + supporting capability
  3. Score by preferences (offline > cost > latency)
  4. Fallback to Echo provider if nothing matches
```

Preferences are configurable via the `ModelRouterOptions`:

- `preferOffline: true` forces Ollama → Echo, skipping cloud.
- `costCeilingUsdCents` rejects models above the threshold.
- `maxLatencyMs` ignores high-latency models for chat-style usage.

## Streaming

The orchestrator's `stream()` returns an `AsyncIterable` of typed chunks:

```ts
type AICompletionChunk =
  | { kind: "delta"; content: string }
  | { kind: "tool-call"; toolCall: AIToolCall }
  | { kind: "done"; finishReason: "stop" | "length" | "tool-call" | "cancelled" }
  | { kind: "error"; error: AetherError }
```

Provider-specific decoding (SSE, NDJSON, Anthropic event stream) is hidden
inside each provider. Cancellation is achieved by aborting the underlying
`fetch`'s `AbortController` and emitting `{ kind: "done", finishReason: "cancelled" }`.

## Fallback chain

When a provider call fails:

1. Retry within the same provider (3 attempts, exponential backoff).
2. If still failing, the router demotes the model for 60 s and reroutes.
3. As a last resort, falls back to the Echo provider with a clear notice
   to the user via `ai:error`.

## Cost & quotas

- Per-request cost estimate computed from token count × model rate.
- Local users see a running daily / monthly total in Settings.
- Pro tier introduces hard quotas with grace handling (queue, downgrade).

## Local-only mode

Toggle in Settings disables every non-local provider. The router treats
Ollama as the only candidate; if Ollama is not running, Echo is used and
the UI surfaces a banner explaining the degraded state.

## Embeddings

`router.embed()` selects an embedding model based on:

1. Explicit `model` hint.
2. `preferOffline` (HashingEmbedder local, or `nomic-embed-text` via Ollama).
3. Cloud (`text-embedding-3-small`) for highest quality.

## Context assembly

`buildContextMessage()` constructs the system prompt from:

- User identity / preferences (from memory).
- Active workspace name + description.
- Active tab title + URL + summary.
- Open-tabs digest (top 10 by recency).
- Pinned memories.
- Per-request directives (e.g. "answer in markdown only").

Total context is capped at 16 KB after truncation so we don't blow past
provider limits.

## Observability

- Every request logged with `{ provider, model, latencyMs, tokensIn, tokensOut, ok }`.
- Streaming chunks counted but content NOT logged unless the user opts in.
- Latency histograms exported to the Settings → Diagnostics panel.
