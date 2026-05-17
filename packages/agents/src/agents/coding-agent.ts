import type { AIOrchestrator } from "@aether/ai-core";
import { Agent, type AgentContext, type AgentRunOutcome } from "../agent";

/**
 * Coding Agent — explains code, suggests fixes, generates snippets and
 * inspects the DOM/network of the active tab. Heavy lifting (sandboxed
 * execution, package installs) is delegated to the Automation Agent or to
 * the user's local devtools.
 */
export class CodingAgent extends Agent {
  readonly kind = "coding" as const;
  readonly name = "Coding Agent";
  readonly description = "Explain code, generate snippets, suggest fixes and refactors.";
  readonly icon = "code";

  constructor(private readonly deps: { ai: AIOrchestrator }) {
    super();
  }

  async run(ctx: AgentContext): Promise<AgentRunOutcome> {
    this.progress(ctx, 0.1);
    const response = await this.deps.ai.complete({
      capability: "code",
      messages: [
        {
          role: "system",
          content:
            "You are a senior software engineer. Respond with concise, idiomatic code in fenced " +
            "code blocks. When asked to explain code, walk through it line by line.",
        },
        { role: "user", content: ctx.prompt },
      ],
      temperature: 0.2,
    });
    this.progress(ctx, 1);
    this.artifact(ctx, { kind: "markdown", title: "Coding Result", content: response.content });
    return { summary: "Coding task completed", artifacts: [{ kind: "markdown", title: "Coding Result", content: response.content }], citations: [] };
  }
}
