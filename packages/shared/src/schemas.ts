import { z } from "zod";

/**
 * Runtime Zod schemas that mirror the shapes in `./types`. Used for validating
 * IPC payloads, plugin manifests and persisted data.
 */

export const AIRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

export const AIMessageSchema = z.object({
  id: z.string().optional(),
  role: AIRoleSchema,
  content: z.string(),
  toolCallId: z.string().optional(),
  name: z.string().optional(),
  createdAt: z.number().optional(),
});

export const AICapabilitySchema = z.enum([
  "chat",
  "summarize",
  "code",
  "research",
  "vision",
  "embedding",
  "rerank",
  "translate",
  "creative",
]);

export const AICompletionRequestSchema = z.object({
  messages: z.array(AIMessageSchema).min(1),
  capability: AICapabilitySchema.optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.record(z.unknown()),
      }),
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const PluginCapabilitySchema = z.enum([
  "ai.use",
  "memory.read",
  "memory.write",
  "tabs.read",
  "tabs.write",
  "automation.create",
  "fs.read",
  "fs.write",
  "net.fetch",
  "clipboard",
  "notifications",
]);

export const PluginUiSurfaceSchema = z.enum([
  "sidebar",
  "command-palette",
  "tab-context",
  "page-action",
  "settings",
]);

export const PluginManifestSchema = z.object({
  id: z.string().regex(/^plg_/),
  name: z.string().min(1).max(80),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().max(500),
  author: z.string(),
  entry: z.string(),
  capabilities: z.array(PluginCapabilitySchema),
  uiSurfaces: z.array(PluginUiSurfaceSchema),
  aetherRange: z.string(),
  homepage: z.string().url().optional(),
  iconUrl: z.string().url().optional(),
});

export const AutomationTriggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cron"), expression: z.string() }),
  z.object({ kind: z.literal("url-change"), url: z.string().url() }),
  z.object({ kind: z.literal("rss"), feed: z.string().url() }),
  z.object({ kind: z.literal("manual") }),
  z.object({ kind: z.literal("hotkey"), combo: z.string() }),
]);
