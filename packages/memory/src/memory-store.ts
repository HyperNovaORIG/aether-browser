import {
  MemoryError,
  newId,
  type MemoryId,
  type MemoryRecord,
  type MemoryScope,
  type MemoryKind,
} from "@aether/shared";
import { globalBus } from "@aether/event-bus";
import { FlatVectorStore } from "./vector-store";
import { HashingEmbedder, type Embedder } from "./embedder";

export interface MemoryStoreOptions {
  embedder?: Embedder;
  /**
   * Optional persistence adapter. The default is in-memory, used in tests
   * and as the fallback when the SQLite driver is unavailable.
   */
  persistence?: MemoryPersistence;
}

export interface MemoryPersistence {
  load(): Promise<MemoryRecord[]>;
  save(records: MemoryRecord[]): Promise<void>;
}

export interface MemoryQuery {
  text?: string;
  scope?: MemoryScope;
  scopeRef?: string;
  kind?: MemoryKind;
  tags?: string[];
  limit?: number;
  pinnedOnly?: boolean;
}

/**
 * Hybrid memory store: keyword + semantic search backed by an embedder and a
 * flat vector index. Persistence is pluggable so the MVP can use a JSON
 * file/SQLite and future versions can swap in LanceDB without API changes.
 */
export class MemoryStore {
  private readonly embedder: Embedder;
  private readonly vectors = new FlatVectorStore<MemoryRecord>();
  private readonly byId = new Map<MemoryId, MemoryRecord>();
  private readonly persistence?: MemoryPersistence;
  private hydrated = false;

  constructor(options: MemoryStoreOptions = {}) {
    this.embedder = options.embedder ?? new HashingEmbedder();
    this.persistence = options.persistence;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated || !this.persistence) {
      this.hydrated = true;
      return;
    }
    const records = await this.persistence.load();
    for (const record of records) {
      this.byId.set(record.id, record);
      if (record.embedding) {
        this.vectors.upsert({ id: record.id, vector: record.embedding, meta: record });
      }
    }
    this.hydrated = true;
  }

  async save(
    input: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt" | "embedding"> & {
      embedding?: number[];
    },
  ): Promise<MemoryRecord> {
    await this.hydrate();
    const now = Date.now();
    const id = newId("memory");
    const embedding = input.embedding ?? (await this.embedder.embed(input.text));
    const record: MemoryRecord = {
      id,
      scope: input.scope,
      scopeRef: input.scopeRef,
      kind: input.kind,
      text: input.text,
      embedding,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      ttlMs: input.ttlMs ?? 0,
      pinned: input.pinned ?? false,
      meta: input.meta,
    };
    this.byId.set(id, record);
    this.vectors.upsert({ id, vector: embedding, meta: record });
    await this.flush();
    globalBus().emit("memory:saved", { record });
    return record;
  }

  async update(id: MemoryId, patch: Partial<Omit<MemoryRecord, "id" | "createdAt">>): Promise<MemoryRecord> {
    await this.hydrate();
    const current = this.byId.get(id);
    if (!current) throw new MemoryError(`Memory ${id} not found`);
    const next: MemoryRecord = { ...current, ...patch, updatedAt: Date.now() };
    if (patch.text && !patch.embedding) {
      next.embedding = await this.embedder.embed(patch.text);
    }
    this.byId.set(id, next);
    if (next.embedding) {
      this.vectors.upsert({ id, vector: next.embedding, meta: next });
    }
    await this.flush();
    return next;
  }

  async delete(id: MemoryId): Promise<boolean> {
    await this.hydrate();
    const existed = this.byId.delete(id);
    if (existed) {
      this.vectors.delete(id);
      await this.flush();
      globalBus().emit("memory:deleted", { memoryId: id });
    }
    return existed;
  }

  async list(scope?: MemoryScope): Promise<MemoryRecord[]> {
    await this.hydrate();
    const records = Array.from(this.byId.values());
    return scope ? records.filter((r) => r.scope === scope) : records;
  }

  async search(query: MemoryQuery): Promise<MemoryRecord[]> {
    await this.hydrate();
    const limit = query.limit ?? 20;
    const filter = (m: MemoryRecord): boolean => {
      if (query.scope && m.scope !== query.scope) return false;
      if (query.scopeRef && m.scopeRef !== query.scopeRef) return false;
      if (query.kind && m.kind !== query.kind) return false;
      if (query.pinnedOnly && !m.pinned) return false;
      if (query.tags?.length && !query.tags.every((t) => m.tags.includes(t))) return false;
      return true;
    };

    if (!query.text || query.text.trim().length === 0) {
      return Array.from(this.byId.values())
        .filter(filter)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit);
    }

    const queryVector = await this.embedder.embed(query.text);
    return this.vectors.search(queryVector, limit, filter).map((r) => r.meta);
  }

  private async flush(): Promise<void> {
    if (!this.persistence) return;
    await this.persistence.save(Array.from(this.byId.values()));
  }
}

/* ------------------------------------------------------------------ */
/*  In-memory persistence (used in tests and as default)              */
/* ------------------------------------------------------------------ */

export class InMemoryPersistence implements MemoryPersistence {
  private store: MemoryRecord[] = [];
  async load(): Promise<MemoryRecord[]> {
    return [...this.store];
  }
  async save(records: MemoryRecord[]): Promise<void> {
    this.store = [...records];
  }
}
