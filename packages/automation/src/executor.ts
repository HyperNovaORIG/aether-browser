import type { AutomationStep, AutomationWorkflow } from "@aether/shared";

export interface AutomationStepHandlers {
  "open-tab": (args: { url: string; background?: boolean }) => Promise<void>;
  summarize: (args: { tabId?: string }) => Promise<void>;
  extract: (args: { tabId?: string; selector?: string }) => Promise<unknown>;
  "ai-prompt": (args: { prompt: string }) => Promise<string>;
  notify: (args: { title: string; body?: string }) => Promise<void>;
  webhook: (args: { url: string; method?: string; body?: unknown }) => Promise<void>;
  "save-memory": (args: { text: string; tags?: string[] }) => Promise<void>;
  agent: (args: { kind: string; prompt: string }) => Promise<void>;
}

export type AutomationHandlerName = keyof AutomationStepHandlers;

/**
 * Step-by-step executor. Each step is dispatched to a host-provided handler;
 * the executor itself does not perform IO so it can be unit-tested in
 * isolation.
 */
export class AutomationExecutor {
  constructor(private readonly handlers: Partial<AutomationStepHandlers>) {}

  async run(workflow: AutomationWorkflow): Promise<void> {
    for (const step of workflow.steps) {
      const handler = this.handlers[step.kind as AutomationHandlerName] as
        | ((args: unknown) => Promise<unknown>)
        | undefined;
      if (!handler) {
        // eslint-disable-next-line no-console
        console.warn(`[automation] no handler registered for ${step.kind}`);
        continue;
      }
      await handler(this.coerceArgs(step));
    }
  }

  private coerceArgs(step: AutomationStep): unknown {
    return step.args ?? {};
  }
}
