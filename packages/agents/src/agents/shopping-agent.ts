import type { AIOrchestrator } from "@aether/ai-core";
import { Agent, type AgentContext, type AgentRunOutcome } from "../agent";

/**
 * Shopping Agent — compares products across retailers, tracks price changes
 * and surfaces reviews. The MVP renders a comparison table; later versions
 * will run autonomous price-tracking via the Automation engine.
 */
export class ShoppingAgent extends Agent {
  readonly kind = "shopping" as const;
  readonly name = "Shopping Agent";
  readonly description = "Compare products, track prices, surface reviews and find best deals.";
  readonly icon = "shopping-bag";

  constructor(private readonly deps: { ai: AIOrchestrator }) {
    super();
  }

  async run(ctx: AgentContext): Promise<AgentRunOutcome> {
    this.progress(ctx, 0.2);
    const response = await this.deps.ai.complete({
      capability: "research",
      messages: [
        {
          role: "system",
          content:
            "You are a shopping assistant. Produce a comparison markdown table with columns: " +
            "Product, Price, Rating, Pros, Cons, Link. Highlight the best value at the end.",
        },
        { role: "user", content: ctx.prompt },
      ],
    });
    this.progress(ctx, 1);
    this.artifact(ctx, { kind: "table", title: "Product Comparison", content: response.content });
    return { summary: "Shopping comparison ready", artifacts: [{ kind: "table", title: "Product Comparison", content: response.content }], citations: [] };
  }
}
