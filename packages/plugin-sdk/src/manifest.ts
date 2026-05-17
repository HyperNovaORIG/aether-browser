import { PluginManifestSchema, type PluginManifest } from "@aether/shared";
import { PluginError } from "@aether/shared";

/**
 * Plugin manifest validation. Plugins ship a `aether.json` next to their
 * entry point. The manifest is validated when the plugin is installed and
 * again at runtime before each privileged call.
 */
export function parseManifest(raw: unknown): PluginManifest {
  const result = PluginManifestSchema.safeParse(raw);
  if (!result.success) {
    throw new PluginError("Invalid plugin manifest", { meta: { issues: result.error.format() } });
  }
  return result.data as PluginManifest;
}

export function manifestSummary(manifest: PluginManifest): string {
  return [
    `Name: ${manifest.name}`,
    `Version: ${manifest.version}`,
    `Capabilities: ${manifest.capabilities.join(", ") || "(none)"}`,
    `Surfaces: ${manifest.uiSurfaces.join(", ") || "(none)"}`,
  ].join("\n");
}
