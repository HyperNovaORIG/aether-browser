/**
 * Pluggable embedding interface. Aether ships with three implementations:
 *
 *   - `HashingEmbedder` — deterministic, offline, no external deps. Used as a
 *     fallback so the memory subsystem always works.
 *   - `OllamaEmbedder` — uses local Ollama (`nomic-embed-text` by default).
 *   - `OpenAIEmbedder` — uses OpenAI's `text-embedding-3-small`.
 *
 * The `@aether/ai-core` package wires the embedder via the model router; this
 * file deliberately has zero network dependencies so it can be unit-tested.
 */

export interface Embedder {
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}

/**
 * Deterministic, hash-based embedding that approximates semantic similarity
 * via random projection of token n-grams. It is intentionally cheap and never
 * fails — perfect as the universal fallback. Real cross-lingual semantic
 * quality requires `OllamaEmbedder` / `OpenAIEmbedder`.
 */
export class HashingEmbedder implements Embedder {
  readonly dimensions: number;

  constructor(dimensions = 256) {
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const vector = new Float64Array(this.dimensions);
    const tokens = tokenize(text);
    for (const token of tokens) {
      const h1 = fnv1a(token) % this.dimensions;
      const sign = (fnv1a("s:" + token) & 1) === 0 ? 1 : -1;
      vector[h1] += sign;
    }
    normalize(vector);
    return Array.from(vector);
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .split(/\s+/u)
    .filter((t) => t.length > 1);
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalize(vector: Float64Array): void {
  let norm = 0;
  for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < vector.length; i++) vector[i] /= norm;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
