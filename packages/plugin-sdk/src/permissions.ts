import { PermissionDeniedError, type PluginCapability, type PluginManifest } from "@aether/shared";

/**
 * Capability-based permission model. Each privileged API checks the plugin's
 * granted set before executing. The host process is the source of truth — the
 * plugin can declare capabilities in its manifest, but the user must approve
 * them via the Settings UI before they are persisted.
 */
export class PermissionSet {
  private readonly granted = new Set<PluginCapability>();

  constructor(initial: PluginCapability[] = []) {
    for (const cap of initial) this.granted.add(cap);
  }

  has(capability: PluginCapability): boolean {
    return this.granted.has(capability);
  }

  require(capability: PluginCapability, action: string): void {
    if (!this.granted.has(capability)) {
      throw new PermissionDeniedError(`Permission "${capability}" required for ${action}`);
    }
  }

  grant(capability: PluginCapability): void {
    this.granted.add(capability);
  }

  revoke(capability: PluginCapability): void {
    this.granted.delete(capability);
  }

  toArray(): PluginCapability[] {
    return Array.from(this.granted);
  }
}

/** Default permission set derived from a manifest with no user overrides. */
export function permissionsFromManifest(manifest: PluginManifest): PermissionSet {
  return new PermissionSet(manifest.capabilities);
}
