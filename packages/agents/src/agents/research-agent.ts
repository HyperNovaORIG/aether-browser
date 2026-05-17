import type { AIOrchestrator } from "@aether/ai-core";
import type { MemoryStore } from "@aether/memory";
import { Agent, type AgentContext, type AgentRunOutcome } from "../agent";

/**
 * Research Agent — multi-step web research with citations.
 *
 * Pipeline:
 *   1. Decompose the prompt into 3–6 sub-queries.
 *   2. For each sub-query, search the web (proxied through the gateway) and
 *      summarise the top results.
 *   3. Synthesize the final answer with inline citations.
 *
 * In the MVP, the actual web search is performed by the `ai-gateway`
 * microservice (or stubbed when offline). Citations are persisted to memory
 * for replay.
 */
export class ResearchAgent extends Agent {
  readonly kind = "research" as const;
  readonly name = "Research Agent";
  readonly description = "Deep web research with citations, source comparison, and synthesis.";
  readonly icon = "search";

  constructor(
    private readonly deps: {
      ai: AIOrchestrator;
      memory: MemoryStore;
      search: (query: string) => Promise<{ url: string; title: string; snippet: string }[]>;
    },
  ) {
    super();
  }

  async run(ctx: AgentContext): Promise<AgentRunOutcome> {
    this.log(ctx, "info", "Planning research");
    this.progress(ctx, 0.05);

    const planResponse = await this.deps.ai.complete({
      capability: "research",
      messages: [
        {
          role: "system",
          content:
            "Decompose the user's question into 3-6 high-quality web search queries. " +
            "Return a JSON array of strings only.",
        },
        { role: "user", content: ctx.prompt },
      ],
      temperature: 0.2,
    });

    const queries = parseQueries(planResponse.content);
    this.log(ctx, "info", `Planned ${queries.length} sub-queries`, { queries });

    const findings: { url: string; title: string; snippet: string }[] = [];
    for (let i = 0; i < queries.length; i++) {
      if (ctx.signal.aborted) break;
      const q = queries[i];
      this.log(ctx, "info", `Searching: ${q}`);
      const results = await this.deps.search(q).catch(() => []);
      for (const r of results.slice(0, 4)) {
        findings.push(r);
        this.citation(ctx, { url: r.url, title: r.title, snippet: r.snippet });
      }
      this.progress(ctx, 0.1 + (0.6 * (i + 1)) / queries.length);
    }

    this.log(ctx, "info", "Synthesizing");
    const synthesis = await this.deps.ai.complete({
      capability: "research",
      messages: [
        {
          role: "system",
          content:
            "You are a senior research analyst. Write a structured markdown report with sections " +
            "and inline citations like [1], [2]. End with a numbered Sources section.",
        },
        {
          role: "user",
          content: `Question:\n${ctx.prompt}\n\nFindings:\n${findings
            .map((f, i) => `[${i + 1}] ${f.title}\n${f.snippet}\n${f.url}`)
            .join("\n\n")}`,
        },
      ],
    });
    this.progress(ctx, 0.95);

    this.artifact(ctx, { kind: "markdown", title: "Research Report", content: synthesis.content });

    await this.deps.memory.save({
      scope: "workspace",
      kind: "note",
      text: `Research report for: ${ctx.prompt}\n\n${synthesis.content}`,
      tags: ["research", "report"],
      pinned: false,
      ttlMs: 0,
    });

    this.progress(ctx, 1);
    return {
      summary: synthesis.content.split("\n").find((l) => l.trim().length > 0) ?? "Research complete",
      artifacts: [{ kind: "markdown", title: "Research Report", content: synthesis.content }],
      citations: findings.map((f) => ({ url: f.url, title: f.title, snippet: f.snippet })),
    };
  }
}

function parseQueries(text: string): string[] {
  const match = text.match(/\[[^\]]*\]/s);
  if (!match) return text.split("\n").map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
  try {
    const arr = JSON.parse(match[0]) as unknown;
    if (Array.isArray(arr)) return arr.filter((q): q is string => typeof q === "string");
  } catch {
    /* fall through */
  }
  return text.split("\n").map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
}
