import { AIRoutingError, type AICapability, type AIModelDescriptor, type AIProviderName } from "@aether/shared";
import type { AIProvider } from "./provider";
import { findModel, MODELS } from "./models";

export interface ModelRouterOptions {
  /**
   * Provider preferences for each capability, expressed as ordered priorities.
   * Defaults are sensible: prefer Anthropic for research/creative, OpenAI for
   * code, Ollama for offline fallback.
   */
  preferences?: Partial<Record<AICapability, AIProviderName[]>>;
  /**
   * If set, the router will prefer offline models whenever they are
   * available — useful for the "Private mode" toggle.
   */
  preferOffline?: boolean;
  /**
   * Hard ceiling on cost per request in cents. The router will skip any
   * model whose worst-case cost exceeds this budget.
   */
  costCeilingUsdCents?: number;
}

const DEFAULT_PREFERENCES: Record<AICapability, AIProviderName[]> = {
  chat: ["anthropic", "openai", "ollama", "echo"],
  summarize: ["openai", "anthropic", "ollama", "echo"],
  code: ["openai", "anthropic", "ollama", "echo"],
  research: ["anthropic", "openai", "ollama", "echo"],
  vision: ["openai", "anthropic", "echo"],
  embedding: ["openai", "ollama", "echo"],
  rerank: ["openai", "ollama", "echo"],
  translate: ["anthropic", "openai", "ollama", "echo"],
  creative: ["anthropic", "openai", "ollama", "echo"],
};

export interface RoutingDecision {
  provider: AIProvider;
  model: AIModelDescriptor;
  reason: string;
}

/**
 * Model router — selects the cheapest available model that can satisfy a
 * given capability while respecting user preferences and offline mode.
 */
export class ModelRouter {
  private readonly providers = new Map<AIProviderName, AIProvider>();
  private readonly preferences: Record<AICapability, AIProviderName[]>;
  private readonly preferOffline: boolean;
  private readonly costCeilingUsdCents?: number;

  constructor(providers: AIProvider[], options: ModelRouterOptions = {}) {
    for (const provider of providers) this.providers.set(provider.name, provider);
    this.preferences = { ...DEFAULT_PREFERENCES, ...(options.preferences ?? {}) };
    this.preferOffline = options.preferOffline ?? false;
    this.costCeilingUsdCents = options.costCeilingUsdCents;
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  list(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Resolve a capability to a concrete provider + model.
   *
   * If an explicit `modelHint` of `provider:model` is given it is honoured;
   * otherwise we walk the preference list and pick the first available model
   * that satisfies the capability and cost ceiling. Offline mode reorders the
   * search so that local providers always win ties.
   */
  async route(capability: AICapability, modelHint?: string): Promise<RoutingDecision> {
    if (modelHint) {
      const [providerName, modelName] = modelHint.split(":");
      const provider = this.providers.get(providerName as AIProviderName);
      const model = findModel(providerName, modelName);
      if (provider && model && (await provider.isAvailable())) {
        return { provider, model, reason: `explicit hint ${modelHint}` };
      }
      throw new AIRoutingError(`Model hint ${modelHint} is unavailable`);
    }

    const order = this.preferenceOrder(capability);
    for (const providerName of order) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;
      if (!(await provider.isAvailable())) continue;
      const model = this.pickModel(providerName, capability);
      if (!model) continue;
      if (this.costCeilingUsdCents !== undefined && (model.costPer1KOutputUsd ?? 0) * 100 * 4 > this.costCeilingUsdCents) {
        continue;
      }
      return { provider, model, reason: `pref=${providerName}` };
    }
    throw new AIRoutingError(`No provider available for capability ${capability}`);
  }

  private preferenceOrder(capability: AICapability): AIProviderName[] {
    const base = this.preferences[capability] ?? DEFAULT_PREFERENCES[capability];
    if (!this.preferOffline) return base;
    const offlineProviders: AIProviderName[] = ["ollama", "echo"];
    return [...offlineProviders.filter((p) => base.includes(p)), ...base.filter((p) => !offlineProviders.includes(p))];
  }

  private pickModel(provider: AIProviderName, capability: AICapability): AIModelDescriptor | undefined {
    const candidates = MODELS.filter((m) => m.provider === provider && m.capabilities.includes(capability));
    candidates.sort((a, b) => (a.costPer1KOutputUsd ?? 0) - (b.costPer1KOutputUsd ?? 0));
    return candidates[0];
  }
}
