import {
  AgentError,
  newId,
  type AgentArtifact,
  type AgentCitation,
  type AgentKind,
  type AgentLog,
  type AgentTask,
  type TaskId,
} from "@aether/shared";

export interface AgentContext {
  /** Stable id of the agent instance. */
  agentId: TaskId;
  /** Prompt that triggered the task. */
  prompt: string;
  /** Optional related browser context. */
  workspaceId?: string;
  tabId?: string;
  /** Streaming hook used to push partial output to the renderer. */
  emit: (chunk: AgentStreamChunk) => void;
  /** Cooperative cancellation signal. */
  signal: AbortSignal;
}

export type AgentStreamChunk =
  | { kind: "log"; log: AgentLog }
  | { kind: "progress"; value: number }
  | { kind: "artifact"; artifact: AgentArtifact }
  | { kind: "citation"; citation: AgentCitation }
  | { kind: "delta"; text: string };

/**
 * Base class for all Aether agents. Agents are stateless across runs — any
 * state must live in `@aether/memory` so it can be inspected, replayed and
 * shared across sessions.
 */
export abstract class Agent {
  abstract readonly kind: AgentKind;
  abstract readonly name: string;
  abstract readonly description: string;
  /**
   * UI hint — single emoji or short icon name used in the agent gallery.
   * The renderer maps these to Lucide icons in `packages/ui/icons`.
   */
  abstract readonly icon: string;

  abstract run(context: AgentContext): Promise<AgentRunOutcome>;

  protected log(context: AgentContext, level: AgentLog["level"], message: string, data?: Record<string, unknown>): void {
    context.emit({ kind: "log", log: { ts: Date.now(), level, message, data } });
  }

  protected progress(context: AgentContext, value: number): void {
    context.emit({ kind: "progress", value });
  }

  protected artifact(context: AgentContext, artifact: AgentArtifact): void {
    context.emit({ kind: "artifact", artifact });
  }

  protected citation(context: AgentContext, citation: AgentCitation): void {
    context.emit({ kind: "citation", citation });
  }

  protected delta(context: AgentContext, text: string): void {
    context.emit({ kind: "delta", text });
  }
}

export interface AgentRunOutcome {
  summary: string;
  artifacts: AgentArtifact[];
  citations: AgentCitation[];
}

export function buildInitialTask(args: {
  agentId: string;
  kind: AgentKind;
  prompt: string;
  workspaceId?: string;
  tabId?: string;
}): AgentTask {
  return {
    id: newId("task"),
    agentId: args.agentId as AgentTask["agentId"],
    kind: args.kind,
    prompt: args.prompt,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workspaceId: args.workspaceId as AgentTask["workspaceId"],
    tabId: args.tabId as AgentTask["tabId"],
    logs: [],
  };
}

export function assertAgent(value: unknown): asserts value is Agent {
  if (!(value instanceof Agent)) {
    throw new AgentError("Value is not an Agent instance");
  }
}
