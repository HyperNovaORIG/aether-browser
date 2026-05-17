import { globalBus } from "@aether/event-bus";
import { PluginError, type PluginId, type PluginManifest } from "@aether/shared";
import { parseManifest } from "./manifest";
import { PermissionSet } from "./permissions";

export interface InstalledPlugin {
  manifest: PluginManifest;
  permissions: PermissionSet;
  enabled: boolean;
  installedAt: number;
}

/**
 * In-memory plugin registry — persisted by the host. Plugin code execution
 * itself lives in `@aether/desktop` so it can be sandboxed inside an
 * Electron `<webview>` or a dedicated `utilityProcess`.
 */
export class PluginRegistry {
  private readonly plugins = new Map<PluginId, InstalledPlugin>();

  list(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  get(id: PluginId): InstalledPlugin | undefined {
    return this.plugins.get(id);
  }

  install(rawManifest: unknown): InstalledPlugin {
    const manifest = parseManifest(rawManifest);
    if (this.plugins.has(manifest.id)) {
      throw new PluginError(`Plugin ${manifest.id} already installed`);
    }
    const plugin: InstalledPlugin = {
      manifest,
      permissions: new PermissionSet(manifest.capabilities),
      enabled: true,
      installedAt: Date.now(),
    };
    this.plugins.set(manifest.id, plugin);
    globalBus().emit("plugin:installed", { manifest });
    return plugin;
  }

  uninstall(id: PluginId): boolean {
    const removed = this.plugins.delete(id);
    if (removed) globalBus().emit("plugin:uninstalled", { pluginId: id });
    return removed;
  }

  setEnabled(id: PluginId, enabled: boolean): void {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new PluginError(`Plugin ${id} is not installed`);
    plugin.enabled = enabled;
  }
}
