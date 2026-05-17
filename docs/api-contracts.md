# Aether API Contracts

Aether speaks three protocols:

- **IPC** between renderer ↔ main, all `ipcRenderer.invoke` / `ipcMain.handle`.
- **HTTP** between desktop ↔ Python `ai-gateway` (localhost only).
- **Events** broadcast on the renderer via `bus:<event>` channels.

Every payload is zod-validated at the boundary. Renderer types live in
`@aether/shared` so the same shape is used on both sides of the bridge.

## IPC channels

| Channel | Direction | Args | Returns |
|---|---|---|---|
| `app:get-info` | R→M | – | `{ version, platform }` |
| `tabs:list` | R→M | – | `Tab[]` |
| `tabs:create` | R→M | `{ url, workspaceId? }` | `Tab` |
| `tabs:close` | R→M | `tabId` | `boolean` |
| `tabs:activate` | R→M | `tabId` | `boolean` |
| `tabs:navigate` | R→M | `tabId, url` | `boolean` |
| `tabs:go-back` | R→M | `tabId` | – |
| `tabs:go-forward` | R→M | `tabId` | – |
| `tabs:reload` | R→M | `tabId` | – |
| `tabs:set-bounds` | R→M | `{x, y, width, height}` | – |
| `ai:chat` | R→M | `AICompletionRequest` | `AICompletionResponse` |
| `ai:stream` | R→M | `AICompletionRequest` | `{ streamId }` |
| `ai:stream-chunk:{id}` | M→R | `AICompletionChunk` | (event) |
| `ai:cancel` | R→M | `streamId` | – |
| `ai:list-providers` | R→M | – | `{ name, available, models[] }[]` |
| `memory:search` | R→M | `MemoryQuery` | `MemoryRecord[]` |
| `memory:save` | R→M | `MemoryRecord` (partial) | `MemoryRecord` |
| `memory:delete` | R→M | `id` | `boolean` |
| `agents:list` | R→M | – | `{ kind, name, description, icon }[]` |
| `agents:list-tasks` | R→M | – | `AgentTask[]` |
| `agents:run` | R→M | `{ kind, prompt, tabId? }` | `AgentTask` |
| `agents:cancel` | R→M | `taskId` | – |
| `workspaces:list` | R→M | – | `Workspace[]` |
| `workspaces:create` | R→M | `{ name }` | `Workspace` |
| `workspaces:switch` | R→M | `workspaceId` | – |
| `commands:run` | R→M | `commandId, args?` | unknown |

## Event channels (M→R, broadcast)

`bus:tab:created`, `bus:tab:updated`, `bus:tab:closed`, `bus:tab:activated`,
`bus:tab:navigated`, `bus:tab:summary`, `bus:workspace:created`,
`bus:workspace:switched`, `bus:workspace:deleted`, `bus:ai:chunk`,
`bus:ai:done`, `bus:ai:error`, `bus:agent:task-created`,
`bus:agent:task-updated`, `bus:agent:task-completed`, `bus:memory:saved`,
`bus:memory:deleted`, `bus:plugin:installed`, `bus:plugin:uninstalled`,
`bus:automation:triggered`, `bus:automation:completed`.

Payload shapes are exhaustively typed in `packages/event-bus/src/events.ts`
under `AetherEventMap`.

## HTTP — AI Gateway

Base URL: `http://127.0.0.1:7788`. Authenticated with a per-launch bearer
token written to a Unix socket file (post-MVP — currently localhost-only).

```
GET  /healthz                              → { status, version, ts }
POST /v1/pdf/summarize    { url }          → { summary, citations, words }
POST /v1/video/summarize  { url }          → { summary, chapters, preview }
POST /v1/web/search       { query, limit } → SearchResult[]
POST /v1/embed            { text[] }       → { vectors[][] }
```

All endpoints return JSON only. Errors follow the RFC-7807 problem-details
shape:

```json
{
  "type": "/errors/AI_PROVIDER_ERROR",
  "title": "Provider rate limited",
  "status": 429,
  "detail": "OpenAI returned 429",
  "code": "AI_PROVIDER_ERROR",
  "meta": { "provider": "openai" }
}
```

## Streaming

`AICompletionChunk` is a discriminated union — see
`packages/shared/src/types.ts`. The renderer never decodes raw SSE; the main
process owns provider-specific decoding (SSE for OpenAI, event stream for
Anthropic, NDJSON for Ollama).

Cancellation: `ai:cancel(streamId)` aborts the underlying `fetch` and emits
a final `{ kind: "done", finishReason: "cancelled" }` chunk.
