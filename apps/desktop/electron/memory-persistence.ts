import { promises as fs } from "node:fs";
import path from "node:path";
import type { MemoryPersistence } from "@aether/memory";
import type { MemoryRecord } from "@aether/shared";

/**
 * Simple JSON-file persistence for the memory store. The MVP keeps records
 * in plaintext for inspectability; a future iteration will encrypt the file
 * at rest using `@aether/memory/crypto` and a passphrase from `safeStorage`.
 */
export class JsonFilePersistence implements MemoryPersistence {
  constructor(private readonly file: string) {}

  async load(): Promise<MemoryRecord[]> {
    try {
      const raw = await fs.readFile(this.file, "utf-8");
      const parsed = JSON.parse(raw) as { records: MemoryRecord[] };
      return parsed.records ?? [];
    } catch {
      return [];
    }
  }

  async save(records: MemoryRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify({ records }, null, 2), "utf-8");
  }
}
