# Aether Memory System

Memory is Aether's continuity layer. It remembers facts, preferences,
research, citations and open tasks across sessions and devices — always
under the user's control.

## Goals

1. **Useful** — the AI must feel like it remembers what matters.
2. **Inspectable** — the user can see, edit, pin and wipe memories.
3. **Private** — encrypted at rest, never sent off-device without consent.
4. **Fast** — sub-50 ms search over 10 k+ records.

## Data model

```ts
interface MemoryRecord {
  id: MemoryId;                     // mem_<ulid>
  scope: MemoryScope;               // user | workspace | session | tab | agent | plugin
  scopeId?: string;
  kind: MemoryKind;                 // fact | preference | note | event | citation | conversation
  text: string;
  sourceUrl?: string;
  tags: string[];
  pinned: boolean;
  ttlMs: number;                    // 0 = forever
  createdAt: number;
  updatedAt: number;
  embedding?: number[];
}
```

Scopes are hierarchical: `user > workspace > session > tab/agent/plugin`.
Search defaults to the active workspace plus the user scope.

## Hybrid search

`MemoryStore.search()` combines:

- **Keyword filter** (case-insensitive substring on `text` and `tags`).
- **Semantic similarity** (cosine over the embedding vector).

```
score(record) =
  0.4 * keywordMatchScore(query.text, record.text)
+ 0.6 * cosine(embed(query.text), record.embedding)
+ pinnedBoost(record)
```

The default embedder is `HashingEmbedder` (deterministic, offline, 256
dims). When the user has API keys it's swapped for
`text-embedding-3-small` (1536 dims) or `nomic-embed-text` via Ollama (768
dims). The store handles dimensional differences by namespacing the vector
index per embedder.

## Encryption

`@aether/memory/crypto` implements AES-256-GCM with scrypt key derivation:

```
ciphertext = [version(1) | salt(16) | iv(12) | authTag(16) | encryptedBody]
```

The store accepts an optional `cipher` and transparently encrypts the
`text` and `embedding` fields before persisting.

The MVP keeps memories as plain JSON for inspectability; Beta encrypts the
file via SQLCipher (see `db-schema.md`).

## Lifecycle

- **TTL** — records with `ttlMs > 0` expire automatically. Background sweeper
  runs every 5 minutes.
- **Pinning** — pinned records survive wipe-on-quit and rank higher in
  search.
- **Versioning** — `update()` rewrites the record in place; full history is
  retained only when the workspace opts in to memory timeline.

## Privacy controls

- Settings → Memory shows every record with filters, sort and bulk wipe.
- **Memory wipe** clears all unpinned records older than a chosen date.
- **Private workspace** toggle disables memory writes entirely.
- **Export** dumps a JSON archive (`aether-memory-YYYY-MM-DD.json`).
- **Import** is allow-list filtered against the user's known scopes.

## Future work

- CRDT-based sync (Yjs) for multi-device with optional team sharing.
- "Time machine" — replay memories chronologically next to browsing
  history.
- Embedding model auto-upgrade with re-indexing job.
- Differential privacy for the shared marketplace insights feed.
