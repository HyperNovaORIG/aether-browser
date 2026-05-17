import { cosineSimilarity } from "./embedder";

export interface VectorEntry<TMeta = Record<string, unknown>> {
  id: string;
  vector: number[];
  meta: TMeta;
}

export interface VectorSearchResult<TMeta = Record<string, unknown>> {
  id: string;
  score: number;
  meta: TMeta;
}

/**
 * In-memory vector index with exact cosine search. The MVP uses a flat scan,
 * which is plenty for tens of thousands of records on modern hardware. A
 * future iteration will swap this for hnswlib-node + LanceDB persistence
 * without changing the API.
 */
export class FlatVectorStore<TMeta = Record<string, unknown>> {
  private readonly entries = new Map<string, VectorEntry<TMeta>>();

  get size(): number {
    return this.entries.size;
  }

  upsert(entry: VectorEntry<TMeta>): void {
    this.entries.set(entry.id, entry);
  }

  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }

  search(query: number[], k = 10, filter?: (meta: TMeta) => boolean): VectorSearchResult<TMeta>[] {
    const results: VectorSearchResult<TMeta>[] = [];
    for (const entry of this.entries.values()) {
      if (filter && !filter(entry.meta)) continue;
      results.push({ id: entry.id, score: cosineSimilarity(query, entry.vector), meta: entry.meta });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  toJSON(): VectorEntry<TMeta>[] {
    return Array.from(this.entries.values());
  }

  static fromJSON<TMeta>(entries: VectorEntry<TMeta>[]): FlatVectorStore<TMeta> {
    const store = new FlatVectorStore<TMeta>();
    for (const entry of entries) store.upsert(entry);
    return store;
  }
}
