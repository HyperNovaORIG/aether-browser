import type {
  AICompletionChunk,
  AICompletionRequest,
  AICompletionResponse,
  AIModelDescriptor,
  AIProviderName,
} from "@aether/shared";

/**
 * Stable contract every AI provider in Aether implements. Providers MUST be
 * stateless beyond cached HTTP clients — orchestration, retries and routing
 * are handled at a higher layer.
 */
export interface AIProvider {
  readonly name: AIProviderName;
  /** List of models this provider can serve in the current environment. */
  listModels(): AIModelDescriptor[];
  /** True when the provider has the credentials/services it needs. */
  isAvailable(): Promise<boolean>;
  /** Non-streaming completion. */
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  /**
   * Streaming completion. Implementations yield chunks until a final `done`
   * chunk is emitted. The async iterable MUST be safely cancellable when
   * the consumer breaks out of the loop.
   */
  stream(request: AICompletionRequest): AsyncIterable<AICompletionChunk>;
  /** Returns an embedding for the supplied text, when supported. */
  embed?(text: string, model?: string): Promise<number[]>;
}
