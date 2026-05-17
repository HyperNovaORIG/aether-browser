import { AIProviderError, type AICompletionChunk, type AICompletionRequest, type AICompletionResponse } from "@aether/shared";
import type { AIProvider } from "../provider";
import { MODELS } from "../models";

export interface AnthropicProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fetcher?: typeof fetch;
}

/**
 * Anthropic provider — uses the Messages API. System prompt is hoisted to the
 * top-level `system` field as required by the API contract.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly fetcher: typeof fetch;

  constructor(options: AnthropicProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com";
    this.defaultModel = options.defaultModel ?? "claude-3-5-haiku-20241022";
    this.fetcher = options.fetcher ?? fetch;
  }

  listModels() {
    return MODELS.filter((m) => m.provider === "anthropic");
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.apiKey) throw new AIProviderError("ANTHROPIC_API_KEY is not configured");
    const body = this.requestBody(request, false);
    const res = await this.fetcher(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new AIProviderError(`Anthropic HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as AnthropicMessageResponse;
    const content = (json.content ?? [])
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("");
    return {
      content,
      model: json.model,
      provider: "anthropic",
      inputTokens: json.usage?.input_tokens,
      outputTokens: json.usage?.output_tokens,
      finishReason: mapStop(json.stop_reason),
    };
  }

  async *stream(request: AICompletionRequest): AsyncIterable<AICompletionChunk> {
    if (!this.apiKey) {
      yield { kind: "error", error: { code: "AI_PROVIDER_ERROR", message: "ANTHROPIC_API_KEY is not configured" } };
      return;
    }
    const body = { ...this.requestBody(request, true) };
    const res = await this.fetcher(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      yield { kind: "error", error: { code: "AI_PROVIDER_ERROR", message: `Anthropic HTTP ${res.status}` } };
      return;
    }
    let aggregated = "";
    let model = this.defaultModel;
    for await (const evt of sseEvents(res.body)) {
      let parsed: AnthropicStreamEvent;
      try {
        parsed = JSON.parse(evt) as AnthropicStreamEvent;
      } catch {
        continue;
      }
      if (parsed.type === "message_start") model = parsed.message?.model ?? model;
      if (parsed.type === "content_block_delta" && parsed.delta?.text) {
        aggregated += parsed.delta.text;
        yield { kind: "delta", content: parsed.delta.text };
      }
      if (parsed.type === "message_stop") {
        yield { kind: "done", response: { content: aggregated, model, provider: "anthropic", finishReason: "stop" } };
        return;
      }
    }
    yield { kind: "done", response: { content: aggregated, model, provider: "anthropic", finishReason: "stop" } };
  }

  private headers(): HeadersInit {
    return {
      "x-api-key": this.apiKey ?? "",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    };
  }

  private requestBody(request: AICompletionRequest, stream: boolean): Record<string, unknown> {
    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    return {
      model: request.model ?? this.defaultModel,
      stream,
      max_tokens: request.maxOutputTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      system: system || undefined,
      messages,
    };
  }
}

interface AnthropicMessageResponse {
  model: string;
  stop_reason?: string;
  content?: ({ type: string } & Record<string, unknown>)[];
  usage?: { input_tokens: number; output_tokens: number };
}

interface AnthropicStreamEvent {
  type: string;
  message?: { model?: string };
  delta?: { text?: string };
}

function mapStop(value: string | undefined): AICompletionResponse["finishReason"] {
  switch (value) {
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    default:
      return undefined;
  }
}

async function* sseEvents(stream: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const dataLine = event.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        yield dataLine.slice(5).trim();
      }
    }
  } finally {
    reader.releaseLock();
  }
}
