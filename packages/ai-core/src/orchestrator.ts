import { globalBus } from "@aether/event-bus";
import {
  AIProviderError,
  AIRoutingError,
  type AICompletionChunk,
  type AICompletionRequest,
  type AICompletionResponse,
} from "@aether/shared";
import type { ModelRouter } from "./router";

export interface OrchestratorOptions {
  router: ModelRouter;
  /** Retries per provider attempt (default 1). */
  retries?: number;
  /** When set, the orchestrator will fall through preference order on errors. */
  fallback?: boolean;
}

/**
 * AI orchestrator — the public API used by the UI, agents and plugins.
 *
 * Responsibilities:
 *   - resolve a `capability` to a concrete provider via `ModelRouter`
 *   - dispatch streaming / non-streaming requests
 *   - emit `ai:*` events on the global bus for observability and UI updates
 *   - transparently retry and fall back across providers
 */
export class AIOrchestrator {
  private readonly router: ModelRouter;
  private readonly retries: number;
  private readonly fallback: boolean;

  constructor(options: OrchestratorOptions) {
    this.router = options.router;
    this.retries = options.retries ?? 1;
    this.fallback = options.fallback ?? true;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const conversationId = (request.metadata?.conversationId as string) ?? `conv_${Date.now()}`;
    globalBus().emit("ai:request", { conversationId, prompt: requestSummary(request) });

    let lastError: unknown;
    let attempts = 0;
    while (attempts <= (this.fallback ? this.retries + 4 : this.retries)) {
      try {
        const decision = await this.router.route(request.capability ?? "chat", request.model);
        const response = await decision.provider.complete({
          ...request,
          model: decision.model.model,
        });
        globalBus().emit("ai:done", { conversationId });
        return response;
      } catch (error) {
        lastError = error;
        attempts++;
        if (!this.fallback && attempts > this.retries) break;
      }
    }
    const aiError = lastError instanceof Error ? lastError : new AIProviderError("Unknown completion failure");
    globalBus().emit("ai:error", {
      conversationId,
      code: aiError instanceof AIRoutingError ? "AI_ROUTING_ERROR" : "AI_PROVIDER_ERROR",
      message: aiError.message,
    });
    throw aiError;
  }

  async *stream(request: AICompletionRequest): AsyncIterable<AICompletionChunk> {
    const conversationId = (request.metadata?.conversationId as string) ?? `conv_${Date.now()}`;
    globalBus().emit("ai:request", { conversationId, prompt: requestSummary(request) });

    try {
      const decision = await this.router.route(request.capability ?? "chat", request.model);
      const iter = decision.provider.stream({ ...request, model: decision.model.model, stream: true });
      for await (const chunk of iter) {
        if (chunk.kind === "delta") {
          globalBus().emit("ai:chunk", { conversationId, delta: chunk.content });
        } else if (chunk.kind === "done") {
          globalBus().emit("ai:done", { conversationId });
        } else if (chunk.kind === "error") {
          globalBus().emit("ai:error", { conversationId, code: chunk.error.code, message: chunk.error.message });
        }
        yield chunk;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof AIRoutingError ? "AI_ROUTING_ERROR" : "AI_PROVIDER_ERROR";
      globalBus().emit("ai:error", { conversationId, code, message });
      yield { kind: "error", error: { code, message } };
    }
  }
}

function requestSummary(request: AICompletionRequest): string {
  const last = request.messages.at(-1)?.content ?? "";
  return last.length > 120 ? `${last.slice(0, 117)}…` : last;
}
