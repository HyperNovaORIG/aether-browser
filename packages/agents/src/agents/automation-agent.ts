import type { AIOrchestrator } from "@aether/ai-core";
import { Agent, type AgentContext, type AgentRunOutcome } from "../agent";

/**
 * Automation Agent — translates a natural-language wish into an
 * `AutomationWorkflow` definition that the Automation engine can run.
 *
 * Example: "Каждое утро открывай мои рабочие вкладки" → cron workflow that
 * opens a set of URLs at 9am with notifications muted.
 */
export class AutomationAgent extends Agent {
  readonly kind = "automation" as const;
  readonly name = "Automation Agent";
  readonly description = "Turn natural-language wishes into runnable automations and macros.";
  readonly icon = "wand";

  constructor(private readonly deps: { ai: AIOrchestrator }) {
    super();
  }

  async run(ctx: AgentContext): Promise<AgentRunOutcome> {
    this.progress(ctx, 0.3);
    const response = await this.deps.ai.complete({
      capability: "code",
      messages: [
        {
          role: "system",
          content:
            "You design Aether automations. Return a strict JSON object with shape " +
            '{ "name": string, "trigger": { kind: "cron" | "manual" | "url-change" | "rss" | "hotkey", ... }, ' +
            '"steps": [{ "kind": "open-tab"|"summarize"|"extract"|"ai-prompt"|"notify"|"webhook"|"save-memory"|"agent", "args": {...} }] }. ' +
            "Do not wrap in markdown. Do not add commentary.",
        },
        { role: "user", content: ctx.prompt },
      ],
      temperature: 0,
    });
    this.progress(ctx, 1);
    this.artifact(ctx, { kind: "json", title: "Automation Definition", content: response.content });
    return { summary: "Automation drafted", artifacts: [{ kind: "json", title: "Automation Definition", content: response.content }], citations: [] };
  }
}
