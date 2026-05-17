import type { AICompletionChunk, AICompletionRequest, AICompletionResponse } from "@aether/shared";
import type { AIProvider } from "../provider";
import { MODELS } from "../models";

/**
 * Offline "echo" provider used in tests, offline mode and as the universal
 * fallback when no API keys are configured. It returns a deterministic mock
 * response so the UI is fully functional out of the box.
 */
export class EchoProvider implements AIProvider {
  readonly name = "echo" as const;

  listModels() {
    return MODELS.filter((m) => m.provider === "echo");
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const last = request.messages.at(-1)?.content ?? "";
    const content = mockAnswer(last);
    return {
      content,
      model: "echo-1",
      provider: "echo",
      inputTokens: approxTokens(last),
      outputTokens: approxTokens(content),
      finishReason: "stop",
    };
  }

  async *stream(request: AICompletionRequest): AsyncIterable<AICompletionChunk> {
    const last = request.messages.at(-1)?.content ?? "";
    const content = mockAnswer(last);
    const words = content.split(/(\s+)/);
    for (const word of words) {
      yield { kind: "delta", content: word };
      await delay(20);
    }
    yield {
      kind: "done",
      response: {
        content,
        model: "echo-1",
        provider: "echo",
        inputTokens: approxTokens(last),
        outputTokens: approxTokens(content),
        finishReason: "stop",
      },
    };
  }
}

function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockAnswer(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return "Hi — I'm Aether. Configure OpenAI / Anthropic / Ollama keys in Settings to enable real AI.";
  }
  return [
    `Echo provider — running offline because no API keys are configured.`,
    ``,
    `**Your prompt**`,
    `> ${trimmed.slice(0, 280)}${trimmed.length > 280 ? "…" : ""}`,
    ``,
    `**Next steps**`,
    `1. Open Settings → AI to add OpenAI / Anthropic keys, or install Ollama for fully local AI.`,
    `2. Try again — you'll get real model responses with streaming, citations, and memory.`,
  ].join("\n");
}
