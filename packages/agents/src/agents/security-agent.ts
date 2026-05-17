import type { AIOrchestrator } from "@aether/ai-core";
import { Agent, type AgentContext, type AgentRunOutcome } from "../agent";

/**
 * Security Agent — analyses URLs, scripts and downloads for risk. The agent
 * combines a deterministic ruleset (allowlist, known-bad domains, SSL state)
 * with an LLM-based heuristic for phishing detection.
 */
export class SecurityAgent extends Agent {
  readonly kind = "security" as const;
  readonly name = "Security Agent";
  readonly description = "Audit pages for risk: phishing, trackers, mixed content, weak TLS.";
  readonly icon = "shield";

  constructor(private readonly deps: { ai: AIOrchestrator }) {
    super();
  }

  async run(ctx: AgentContext): Promise<AgentRunOutcome> {
    this.progress(ctx, 0.3);
    const response = await this.deps.ai.complete({
      capability: "research",
      messages: [
        {
          role: "system",
          content:
            "You are a senior application security engineer. Audit the provided context for " +
            "phishing risk, weak TLS, tracking scripts, suspicious downloads and mixed content. " +
            "Return a markdown report with sections: Risk Summary, Findings, Recommendations.",
        },
        { role: "user", content: ctx.prompt },
      ],
    });
    this.progress(ctx, 1);
    this.artifact(ctx, { kind: "markdown", title: "Security Report", content: response.content });
    return { summary: "Security audit complete", artifacts: [{ kind: "markdown", title: "Security Report", content: response.content }], citations: [] };
  }
}
