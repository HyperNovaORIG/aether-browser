import type { PrefixedId } from "./ids";

/* ------------------------------------------------------------------ */
/*  Browser primitives                                                 */
/* ------------------------------------------------------------------ */

export type TabId = PrefixedId<"tab">;
export type WorkspaceId = PrefixedId<"wks">;
export type ProfileId = PrefixedId<"prf">;
export type AgentId = PrefixedId<"agt">;
export type TaskId = PrefixedId<"tsk">;
export type MessageId = PrefixedId<"msg">;
export type MemoryId = PrefixedId<"mem">;
export type PluginId = PrefixedId<"plg">;
export type AutomationId = PrefixedId<"atm">;
export type SessionId = PrefixedId<"ses">;

export interface Tab {
  id: TabId;
  workspaceId: WorkspaceId;
  profileId: ProfileId;
  url: string;
  title: string;
  faviconUrl?: string;
  pinned: boolean;
  muted: boolean;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  createdAt: number;
  lastActiveAt: number;
  /** AI summary computed for the page, may be undefined while pending. */
  aiSummary?: string;
  /** Semantic tags inferred from page content. */
  tags: string[];
  /** Persistent per-tab notes (workspace-scoped). */
  notes?: string;
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  icon?: string;
  color?: string;
  profileId: ProfileId;
  createdAt: number;
  updatedAt: number;
  description?: string;
}

export interface Profile {
  id: ProfileId;
  name: string;
  /** Electron `session.partition` string, e.g. `persist:prf_xxx`. */
  partition: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/*  AI primitives                                                      */
/* ------------------------------------------------------------------ */

export type AIProviderName = "openai" | "anthropic" | "ollama" | "echo";

export type AIRole = "system" | "user" | "assistant" | "tool";

export interface AIMessage {
  id?: MessageId;
  role: AIRole;
  content: string;
  toolCallId?: string;
  name?: string;
  createdAt?: number;
}

export interface AICompletionRequest {
  /** Conversation messages, oldest first. */
  messages: AIMessage[];
  /** Logical capability identifier (e.g. `chat`, `summarize`, `code`). */
  capability?: AICapability;
  /** Optional explicit model override (`openai:gpt-4o-mini`). */
  model?: string;
  /** Sampling temperature (0..2). */
  temperature?: number;
  /** Max output tokens, provider-specific cap may apply. */
  maxOutputTokens?: number;
  /** Tools that the model may call. */
  tools?: AIToolDefinition[];
  /** Whether the response should be streamed. */
  stream?: boolean;
  /** Free-form metadata attached for telemetry/routing. */
  metadata?: Record<string, unknown>;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  provider: AIProviderName;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: "stop" | "length" | "tool_calls" | "content_filter" | "error";
  toolCalls?: AIToolCall[];
}

export type AICompletionChunk =
  | { kind: "delta"; content: string }
  | { kind: "tool_call"; toolCall: AIToolCall }
  | { kind: "done"; response: AICompletionResponse }
  | { kind: "error"; error: { code: string; message: string } };

export type AICapability =
  | "chat"
  | "summarize"
  | "code"
  | "research"
  | "vision"
  | "embedding"
  | "rerank"
  | "translate"
  | "creative";

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIModelDescriptor {
  provider: AIProviderName;
  model: string;
  /** Capabilities this model is good at. */
  capabilities: AICapability[];
  /** Approximate input context window in tokens. */
  contextWindow: number;
  /** Cost per 1K input / output tokens in USD (purely advisory). */
  costPer1KInputUsd?: number;
  costPer1KOutputUsd?: number;
  /** Indicative TTFT in ms. */
  latencyHintMs?: number;
  /** Whether the model can run fully offline. */
  offline: boolean;
}

/* ------------------------------------------------------------------ */
/*  Memory primitives                                                  */
/* ------------------------------------------------------------------ */

export type MemoryScope = "user" | "workspace" | "tab" | "session" | "agent";

export type MemoryKind =
  | "fact"
  | "preference"
  | "project"
  | "task"
  | "note"
  | "chat"
  | "page";

export interface MemoryRecord {
  id: MemoryId;
  scope: MemoryScope;
  scopeRef?: string;
  kind: MemoryKind;
  text: string;
  /** Optional dense vector for semantic search. */
  embedding?: number[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  /** TTL in ms (0 = forever). */
  ttlMs: number;
  /** When true, user explicitly pinned the memory. */
  pinned: boolean;
  meta?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Agent primitives                                                   */
/* ------------------------------------------------------------------ */

export type AgentKind =
  | "research"
  | "coding"
  | "shopping"
  | "security"
  | "travel"
  | "automation";

export type AgentStatus =
  | "idle"
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentTask {
  id: TaskId;
  agentId: AgentId;
  kind: AgentKind;
  prompt: string;
  status: AgentStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  workspaceId?: WorkspaceId;
  tabId?: TabId;
  result?: AgentTaskResult;
  logs: AgentLog[];
}

export interface AgentTaskResult {
  summary: string;
  artifacts: AgentArtifact[];
  citations: AgentCitation[];
}

export interface AgentArtifact {
  kind: "markdown" | "table" | "json" | "image" | "url";
  title: string;
  content: string;
}

export interface AgentCitation {
  url: string;
  title: string;
  snippet?: string;
}

export interface AgentLog {
  ts: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Plugin primitives                                                  */
/* ------------------------------------------------------------------ */

export interface PluginManifest {
  id: PluginId;
  name: string;
  version: string;
  description: string;
  author: string;
  entry: string;
  capabilities: PluginCapability[];
  uiSurfaces: PluginUiSurface[];
  /** Minimum compatible Aether version (semver range). */
  aetherRange: string;
  homepage?: string;
  iconUrl?: string;
}

export type PluginCapability =
  | "ai.use"
  | "memory.read"
  | "memory.write"
  | "tabs.read"
  | "tabs.write"
  | "automation.create"
  | "fs.read"
  | "fs.write"
  | "net.fetch"
  | "clipboard"
  | "notifications";

export type PluginUiSurface =
  | "sidebar"
  | "command-palette"
  | "tab-context"
  | "page-action"
  | "settings";

/* ------------------------------------------------------------------ */
/*  Automation primitives                                              */
/* ------------------------------------------------------------------ */

export interface AutomationWorkflow {
  id: AutomationId;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  steps: AutomationStep[];
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  workspaceId?: WorkspaceId;
}

export type AutomationTrigger =
  | { kind: "cron"; expression: string }
  | { kind: "url-change"; url: string }
  | { kind: "rss"; feed: string }
  | { kind: "manual" }
  | { kind: "hotkey"; combo: string };

export interface AutomationStep {
  kind:
    | "open-tab"
    | "summarize"
    | "extract"
    | "ai-prompt"
    | "notify"
    | "webhook"
    | "save-memory"
    | "agent";
  args: Record<string, unknown>;
}
