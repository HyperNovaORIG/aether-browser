import { AIProviderError, type AICompletionChunk, type AICompletionRequest, type AICompletionResponse } from "@aether/shared";
import type { AIProvider } from "../provider";
import { MODELS } from "../models";

export interface OpenAIProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  /** Custom fetch — used for unit tests and Electron's net.fetch. */
  fetcher?: typeof fetch;
}

/**
 * OpenAI provider — uses the Chat Completions API for maximal compatibility.
 *
 * Streaming uses the SSE protocol (`data: { ... }\n\n`). We deliberately
 * avoid the official SDK to keep the bundle small in the Electron main
 * process and to allow a custom `fetcher` for sandboxing.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly fetcher: typeof fetch;

  constructor(options: OpenAIProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.defaultModel = options.defaultModel ?? "gpt-4o-mini";
    this.fetcher = options.fetcher ?? fetch;
  }

  listModels() {
    return MODELS.filter((m) => m.provider === "openai");
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.apiKey) throw new AIProviderError("OPENAI_API_KEY is not configured");
    const body = this.requestBody(request, false);
    const res = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new AIProviderError(`OpenAI HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as OpenAIChatResponse;
    const choice = json.choices[0];
    return {
      content: choice?.message?.content ?? "",
      model: json.model,
      provider: "openai",
      inputTokens: json.usage?.prompt_tokens,
      outputTokens: json.usage?.completion_tokens,
      finishReason: mapFinish(choice?.finish_reason),
    };
  }

  async *stream(request: AICompletionRequest): AsyncIterable<AICompletionChunk> {
    if (!this.apiKey) {
      yield { kind: "error", error: { code: "AI_PROVIDER_ERROR", message: "OPENAI_API_KEY is not configured" } };
      return;
    }
    const body = this.requestBody(request, true);
    const res = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      yield { kind: "error", error: { code: "AI_PROVIDER_ERROR", message: `OpenAI HTTP ${res.status}` } };
      return;
    }
    let aggregated = "";
    let model = this.defaultModel;
    for await (const evt of sseEvents(res.body)) {
      if (evt === "[DONE]") {
        yield {
          kind: "done",
          response: { content: aggregated, model, provider: "openai", finishReason: "stop" },
        };
        return;
      }
      let parsed: OpenAIStreamChunk;
      try {
        parsed = JSON.parse(evt) as OpenAIStreamChunk;
      } catch {
        continue;
      }
      model = parsed.model ?? model;
      const delta = parsed.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        aggregated += delta;
        yield { kind: "delta", content: delta };
      }
    }
    yield { kind: "done", response: { content: aggregated, model, provider: "openai", finishReason: "stop" } };
  }

  async embed(text: string, model = "text-embedding-3-small"): Promise<number[]> {
    if (!this.apiKey) throw new AIProviderError("OPENAI_API_KEY is not configured");
    const res = await this.fetcher(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model, input: text }),
    });
    if (!res.ok) throw new AIProviderError(`OpenAI embeddings HTTP ${res.status}`);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data[0]?.embedding ?? [];
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private requestBody(request: AICompletionRequest, stream: boolean): Record<string, unknown> {
    return {
      model: request.model ?? this.defaultModel,
      stream,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxOutputTokens,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content, name: m.name })),
      tools: request.tools?.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
    };
  }
}

interface OpenAIChatResponse {
  model: string;
  choices: {
    finish_reason?: string;
    message?: { content?: string };
  }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

interface OpenAIStreamChunk {
  model?: string;
  choices?: { delta?: { content?: string } }[];
}

function mapFinish(value: string | undefined): AICompletionResponse["finishReason"] {
  switch (value) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
      return "tool_calls";
    case "content_filter":
      return "content_filter";
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
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        yield trimmed.slice(5).trim();
      }
    }
  } finally {
    reader.releaseLock();
  }
}
