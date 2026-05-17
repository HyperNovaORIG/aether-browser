import { globalBus } from "@aether/event-bus";
import type { AutomationWorkflow } from "@aether/shared";
import { nextRun } from "./cron";
import { AutomationExecutor, type AutomationStepHandlers } from "./executor";

export interface AutomationSchedulerOptions {
  handlers: Partial<AutomationStepHandlers>;
  /** Tick interval in ms (default 30s). */
  tickMs?: number;
}

interface ScheduleEntry {
  workflow: AutomationWorkflow;
  nextAt: number;
}

/**
 * Aether automation scheduler. Stores workflows in memory and dispatches
 * them when their trigger fires. Cron triggers use the simple 5-field
 * parser in `./cron`. Persistence is handled by the host (SQLite).
 */
export class AutomationScheduler {
  private readonly executor: AutomationExecutor;
  private readonly workflows = new Map<string, ScheduleEntry>();
  private timer?: ReturnType<typeof setInterval>;
  private readonly tickMs: number;

  constructor(options: AutomationSchedulerOptions) {
    this.executor = new AutomationExecutor(options.handlers);
    this.tickMs = options.tickMs ?? 30_000;
  }

  add(workflow: AutomationWorkflow): void {
    const entry: ScheduleEntry = { workflow, nextAt: this.computeNext(workflow) };
    this.workflows.set(workflow.id, entry);
  }

  remove(workflowId: string): void {
    this.workflows.delete(workflowId);
  }

  setEnabled(workflowId: string, enabled: boolean): void {
    const entry = this.workflows.get(workflowId);
    if (!entry) return;
    entry.workflow.enabled = enabled;
    if (enabled) entry.nextAt = this.computeNext(entry.workflow);
  }

  list(): AutomationWorkflow[] {
    return Array.from(this.workflows.values()).map((e) => e.workflow);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async triggerNow(workflowId: string): Promise<void> {
    const entry = this.workflows.get(workflowId);
    if (!entry) return;
    await this.fire(entry);
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const entry of this.workflows.values()) {
      if (!entry.workflow.enabled) continue;
      if (entry.nextAt > now) continue;
      await this.fire(entry);
      entry.nextAt = this.computeNext(entry.workflow);
    }
  }

  private async fire(entry: ScheduleEntry): Promise<void> {
    globalBus().emit("automation:triggered", { workflow: entry.workflow });
    let ok = true;
    try {
      await this.executor.run(entry.workflow);
      entry.workflow.lastRunAt = Date.now();
    } catch (error) {
      ok = false;
      // eslint-disable-next-line no-console
      console.error("[automation] workflow failed", entry.workflow.id, error);
    } finally {
      globalBus().emit("automation:completed", { workflowId: entry.workflow.id, ok });
    }
  }

  private computeNext(workflow: AutomationWorkflow): number {
    if (workflow.trigger.kind === "cron") {
      try {
        return nextRun(workflow.trigger.expression).getTime();
      } catch {
        return Number.POSITIVE_INFINITY;
      }
    }
    // Non-cron triggers are dispatched externally; we schedule them far in
    // the future so the tick loop never picks them up.
    return Number.POSITIVE_INFINITY;
  }
}
