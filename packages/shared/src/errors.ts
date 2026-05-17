/**
 * Typed error hierarchy used across the Aether codebase. All thrown errors
 * SHOULD extend `AetherError` so they can be safely serialised across IPC and
 * surfaced to telemetry with a stable `code`.
 */

export class AetherError extends Error {
  readonly code: string;
  readonly cause: unknown;
  readonly meta: Record<string, unknown>;

  constructor(code: string, message: string, options: { cause?: unknown; meta?: Record<string, unknown> } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = options.cause;
    this.meta = options.meta ?? {};
  }

  toJSON(): {
    name: string;
    code: string;
    message: string;
    meta: Record<string, unknown>;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      meta: this.meta,
    };
  }
}

export class AIProviderError extends AetherError {
  constructor(message: string, options?: { cause?: unknown; meta?: Record<string, unknown> }) {
    super("AI_PROVIDER_ERROR", message, options);
  }
}

export class AIRoutingError extends AetherError {
  constructor(message: string, options?: { cause?: unknown; meta?: Record<string, unknown> }) {
    super("AI_ROUTING_ERROR", message, options);
  }
}

export class MemoryError extends AetherError {
  constructor(message: string, options?: { cause?: unknown; meta?: Record<string, unknown> }) {
    super("MEMORY_ERROR", message, options);
  }
}

export class AgentError extends AetherError {
  constructor(message: string, options?: { cause?: unknown; meta?: Record<string, unknown> }) {
    super("AGENT_ERROR", message, options);
  }
}

export class PluginError extends AetherError {
  constructor(message: string, options?: { cause?: unknown; meta?: Record<string, unknown> }) {
    super("PLUGIN_ERROR", message, options);
  }
}

export class PermissionDeniedError extends AetherError {
  constructor(message: string, options?: { cause?: unknown; meta?: Record<string, unknown> }) {
    super("PERMISSION_DENIED", message, options);
  }
}
