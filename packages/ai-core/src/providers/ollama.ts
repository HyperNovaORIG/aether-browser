import { AIProviderError, type AICompletionChunk, type AICompletionRequest, type AICompletionResponse } from "@aether/shared";
import type { AIProvider } from "../provider";
import { MODELS } from "../models";

export interface OllamaProviderOptions {
  baseUrl?: string;
  defaultModel?: string;
  fetcher?: typeof fetch;
}

/**
 * Ollama provider — talks to a local `ollama serve` instance over HTTP. The
 * provider is treated as available iff `GET /api/tags` succeeds.
 */
export class OllamaProvider implements AIProvider {
  readonly name = "ollama" as const;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly fetcher: typeof fetch;
  private availabilityCache?: { ok: boolean; ts: number };

  constructor(options: OllamaProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
    this.defaultModel = options.defaultModel ?? "llama3.1:8b";
    this.fetcher = options.fetcher ?? fetch;
  }

  listModels() {
    return MODELS.filter((m) => m.provider === "ollama");
  }

  async isAvailable(): Promise<boolean> {
    if (this.availabilityCache && Date.now() - this.availabilityCache.ts < 5_000) {
      return this.availabilityCache.ok;
    }
    try {
      const res = await this.fetcher(`${this.baseUrl}/api/tags`, { method: "GET" });
      const ok = res.ok;
      this.availabilityCache = { ok, ts: Date.now() };
      return ok;
    } catch {
      this.availabilityCache = { ok: false, ts: Date.now() };
      return false;
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const res = await this.fetcher(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model ?? this.defaultModel,
        stream: false,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        options: { temperature: request.temperature ?? 0.7 },
      }),
    });
    if (!res.ok) throw new AIProviderError(`Ollama HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { message?: { content?: string }; model?: string };
    return {
      content: json.message?.content ?? "",
      model: json.model ?? this.defaultModel,
      provider: "ollama",
      finishReason: "stop",
    };
  }

  async *stream(request: AICompletionRequest): AsyncIterable<AICompletionChunk> {
    const res = await this.fetcher(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model ?? this.defaultModel,
        stream: true,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        options: { temperature: request.temperature ?? 0.7 },
      }),
    });
    if (!res.ok || !res.body) {
      yield { kind: "error", error: { code: "AI_PROVIDER_ERROR", message: `Ollama HTTP ${res.status}` } };
      return;
    }
    let aggregated = "";
    let model = request.model ?? this.defaultModel;
    for await (const line of ndjson(res.body)) {
      try {
        const parsed = JSON.parse(line) as { message?: { content?: string }; model?: string; done?: boolean };
        const delta = parsed.message?.content ?? "";
        if (delta) {
          aggregated += delta;
          yield { kind: "delta", content: delta };
        }
        model = parsed.model ?? model;
        if (parsed.done) {
          yield { kind: "done", response: { content: aggregated, model, provider: "ollama", finishReason: "stop" } };
          return;
        }
      } catch {
        continue;
      }
    }
    yield { kind: "done", response: { content: aggregated, model, provider: "ollama", finishReason: "stop" } };
  }

  async embed(text: string, model = "nomic-embed-text"): Promise<number[]> {
    const res = await this.fetcher(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) throw new AIProviderError(`Ollama embeddings HTTP ${res.status}`);
    const json = (await res.json()) as { embedding: number[] };
    return json.embedding;
  }
}

async function* ndjson(stream: ReadableStream<Uint8Array>): AsyncIterable<string> {
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
        if (!trimmed) continue;
        yield trimmed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
