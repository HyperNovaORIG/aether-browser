import type { AIOrchestrator } from "@aether/ai-core";
import { Agent, type AgentContext, type AgentRunOutcome } from "../agent";

/**
 * Travel Agent — plans itineraries, compares flights/hotels, and produces
 * day-by-day schedules. Hooks into the user's calendar via plugins.
 */
export class TravelAgent extends Agent {
  readonly kind = "travel" as const;
  readonly name = "Travel Agent";
  readonly description = "Plan trips, build day-by-day itineraries, compare flights and hotels.";
  readonly icon = "plane";

  constructor(private readonly deps: { ai: AIOrchestrator }) {
    super();
  }

  async run(ctx: AgentContext): Promise<AgentRunOutcome> {
    this.progress(ctx, 0.2);
    const response = await this.deps.ai.complete({
      capability: "creative",
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous travel planner. Produce a markdown itinerary with sections per day, " +
            "morning/afternoon/evening blocks, restaurant suggestions and approximate costs in USD.",
        },
        { role: "user", content: ctx.prompt },
      ],
    });
    this.progress(ctx, 1);
    this.artifact(ctx, { kind: "markdown", title: "Travel Itinerary", content: response.content });
    return { summary: "Itinerary ready", artifacts: [{ kind: "markdown", title: "Travel Itinerary", content: response.content }], citations: [] };
  }
}
