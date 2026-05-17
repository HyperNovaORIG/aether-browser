import type { AIModelDescriptor } from "@aether/shared";

/**
 * Canonical model catalogue. The router uses this metadata to pick a model
 * for a given capability, taking into account cost, latency, context window
 * and offline availability.
 */
export const MODELS: AIModelDescriptor[] = [
  {
    provider: "openai",
    model: "gpt-4o-mini",
    capabilities: ["chat", "summarize", "translate", "code"],
    contextWindow: 128_000,
    costPer1KInputUsd: 0.00015,
    costPer1KOutputUsd: 0.0006,
    latencyHintMs: 600,
    offline: false,
  },
  {
    provider: "openai",
    model: "gpt-4o",
    capabilities: ["chat", "research", "vision", "code", "creative"],
    contextWindow: 128_000,
    costPer1KInputUsd: 0.005,
    costPer1KOutputUsd: 0.015,
    latencyHintMs: 900,
    offline: false,
  },
  {
    provider: "openai",
    model: "text-embedding-3-small",
    capabilities: ["embedding"],
    contextWindow: 8_192,
    costPer1KInputUsd: 0.00002,
    offline: false,
  },
  {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    capabilities: ["chat", "research", "code", "creative", "vision"],
    contextWindow: 200_000,
    costPer1KInputUsd: 0.003,
    costPer1KOutputUsd: 0.015,
    latencyHintMs: 900,
    offline: false,
  },
  {
    provider: "anthropic",
    model: "claude-3-5-haiku-20241022",
    capabilities: ["chat", "summarize", "translate"],
    contextWindow: 200_000,
    costPer1KInputUsd: 0.0008,
    costPer1KOutputUsd: 0.004,
    latencyHintMs: 500,
    offline: false,
  },
  {
    provider: "ollama",
    model: "llama3.1:8b",
    capabilities: ["chat", "summarize", "code"],
    contextWindow: 8_192,
    latencyHintMs: 400,
    offline: true,
  },
  {
    provider: "ollama",
    model: "qwen2.5:7b",
    capabilities: ["chat", "code", "translate"],
    contextWindow: 32_768,
    latencyHintMs: 500,
    offline: true,
  },
  {
    provider: "ollama",
    model: "nomic-embed-text",
    capabilities: ["embedding"],
    contextWindow: 8_192,
    offline: true,
  },
  {
    provider: "echo",
    model: "echo-1",
    capabilities: ["chat", "summarize", "translate", "code", "creative", "research"],
    contextWindow: 32_000,
    latencyHintMs: 50,
    offline: true,
  },
];

export function findModel(provider: string, model: string): AIModelDescriptor | undefined {
  return MODELS.find((m) => m.provider === provider && m.model === model);
}
