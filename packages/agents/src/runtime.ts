import { globalBus } from "@aether/event-bus";
import {
  AgentError,
  newId,
  type AgentKind,
  type AgentTask,
  type TaskId,
} from "@aether/shared";
import { buildInitialTask, type Agent, type AgentContext } from "./agent";

export interface AgentRuntimeOptions {
  /** Maximum number of agent tasks running concurrently (default 4). */
  concurrency?: number;
}

interface RunningTask {
  task: AgentTask;
  controller: AbortController;
  promise: Promise<void>;
}

/**
 * Multi-agent runtime — schedules agent tasks with bounded concurrency,
 * keeps a typed registry, surfaces progress on the global event bus, and
 * supports cooperative cancellation.
 */
export class AgentRuntime {
  private readonly agents = new Map<AgentKind, Agent>();
  private readonly tasks = new Map<TaskId, AgentTask>();
  private readonly running = new Map<TaskId, RunningTask>();
  private readonly queue: TaskId[] = [];
  private readonly concurrency: number;

  constructor(agents: Agent[], options: AgentRuntimeOptions = {}) {
    for (const agent of agents) this.agents.set(agent.kind, agent);
    this.concurrency = options.concurrency ?? 4;
  }

  register(agent: Agent): void {
    this.agents.set(agent.kind, agent);
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  /** Enqueue a new task for the given agent. */
  enqueue(args: { kind: AgentKind; prompt: string; workspaceId?: string; tabId?: string }): AgentTask {
    const agent = this.agents.get(args.kind);
    if (!agent) throw new AgentError(`Unknown agent kind: ${args.kind}`);

    const task = buildInitialTask({
      agentId: newId("agent"),
      ...args,
    });
    this.tasks.set(task.id, task);
    this.queue.push(task.id);
    globalBus().emit("agent:task-created", { task });
    this.drain();
    return task;
  }

  cancel(taskId: TaskId): void {
    const running = this.running.get(taskId);
    if (running) running.controller.abort();
    const task = this.tasks.get(taskId);
    if (task && task.status === "queued") {
      task.status = "cancelled";
      task.updatedAt = Date.now();
      globalBus().emit("agent:task-updated", { task });
    }
  }

  get(taskId: TaskId): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  listTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  private drain(): void {
    while (this.running.size < this.concurrency && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) break;
      this.start(taskId);
    }
  }

  private start(taskId: TaskId): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    const agent = this.agents.get(task.kind);
    if (!agent) {
      task.status = "failed";
      task.updatedAt = Date.now();
      globalBus().emit("agent:task-updated", { task });
      return;
    }

    const controller = new AbortController();
    const context: AgentContext = {
      agentId: task.id,
      prompt: task.prompt,
      workspaceId: task.workspaceId,
      tabId: task.tabId,
      signal: controller.signal,
      emit: (chunk) => {
        if (chunk.kind === "progress") {
          task.progress = Math.max(0, Math.min(1, chunk.value));
        } else if (chunk.kind === "log") {
          task.logs.push(chunk.log);
        }
        task.updatedAt = Date.now();
        globalBus().emit("agent:task-updated", { task });
      },
    };

    task.status = "running";
    task.updatedAt = Date.now();
    globalBus().emit("agent:task-updated", { task });

    const promise = (async () => {
      try {
        const outcome = await agent.run(context);
        task.status = "completed";
        task.progress = 1;
        task.result = {
          summary: outcome.summary,
          artifacts: outcome.artifacts,
          citations: outcome.citations,
        };
        task.updatedAt = Date.now();
        globalBus().emit("agent:task-completed", { task });
      } catch (error) {
        task.status = controller.signal.aborted ? "cancelled" : "failed";
        task.updatedAt = Date.now();
        task.logs.push({
          ts: Date.now(),
          level: "error",
          message: error instanceof Error ? error.message : String(error),
        });
        globalBus().emit("agent:task-updated", { task });
      } finally {
        this.running.delete(task.id);
        this.drain();
      }
    })();

    this.running.set(task.id, { task, controller, promise });
  }
}
