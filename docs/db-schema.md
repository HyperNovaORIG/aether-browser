# Aether Database Schema

The MVP persists state as JSON files inside `app.getPath('userData')`. The
schema below documents the canonical SQLite layout that Aether will migrate
to once the data volume grows past ~10 MB per profile (target: Beta).

Storage engine: **SQLite** + `sqlite-vss` for vector search. WAL mode.
Encrypted at rest with SQLCipher using a key sourced from
`safeStorage.encryptString` and stored in the OS keychain.

```sql
-- ─── workspaces ────────────────────────────────────────────────────────
CREATE TABLE workspaces (
    id           TEXT PRIMARY KEY,                  -- wks_<ulid>
    profile_id   TEXT NOT NULL REFERENCES profiles(id),
    name         TEXT NOT NULL,
    color        TEXT,
    icon         TEXT,
    description  TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);

CREATE TABLE profiles (
    id           TEXT PRIMARY KEY,                  -- prf_<ulid>
    name         TEXT NOT NULL,
    partition    TEXT NOT NULL UNIQUE,
    created_at   INTEGER NOT NULL
);

-- ─── tabs ─────────────────────────────────────────────────────────────
CREATE TABLE tabs (
    id              TEXT PRIMARY KEY,               -- tab_<ulid>
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id),
    profile_id      TEXT NOT NULL REFERENCES profiles(id),
    url             TEXT NOT NULL,
    title           TEXT NOT NULL,
    favicon_url     TEXT,
    pinned          INTEGER NOT NULL DEFAULT 0,
    muted           INTEGER NOT NULL DEFAULT 0,
    summary         TEXT,
    tags_json       TEXT NOT NULL DEFAULT '[]',
    created_at      INTEGER NOT NULL,
    last_active_at  INTEGER NOT NULL
);
CREATE INDEX tabs_workspace_idx ON tabs(workspace_id);

-- ─── memory ───────────────────────────────────────────────────────────
CREATE TABLE memories (
    id           TEXT PRIMARY KEY,                  -- mem_<ulid>
    scope        TEXT NOT NULL CHECK (scope IN ('user','workspace','session','tab','agent','plugin')),
    scope_id     TEXT,
    kind         TEXT NOT NULL,                     -- fact | preference | note | event | citation | conversation
    text         TEXT NOT NULL,
    source_url   TEXT,
    tags_json    TEXT NOT NULL DEFAULT '[]',
    pinned       INTEGER NOT NULL DEFAULT 0,
    ttl_ms       INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    embedding    BLOB                               -- float32[] (dimensions vary)
);
CREATE INDEX memories_scope_idx ON memories(scope, scope_id);
CREATE INDEX memories_pinned_idx ON memories(pinned DESC, updated_at DESC);
CREATE VIRTUAL TABLE memories_vec USING vss0(embedding(384));

-- ─── agents ───────────────────────────────────────────────────────────
CREATE TABLE agent_tasks (
    id             TEXT PRIMARY KEY,                -- tsk_<ulid>
    agent_id       TEXT NOT NULL,
    kind           TEXT NOT NULL,
    prompt         TEXT NOT NULL,
    status         TEXT NOT NULL,                   -- queued|running|completed|failed|cancelled
    progress       REAL NOT NULL DEFAULT 0,
    workspace_id   TEXT REFERENCES workspaces(id),
    tab_id         TEXT REFERENCES tabs(id),
    result_json    TEXT,
    logs_json      TEXT NOT NULL DEFAULT '[]',
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL
);

-- ─── automations ──────────────────────────────────────────────────────
CREATE TABLE automations (
    id           TEXT PRIMARY KEY,                  -- aut_<ulid>
    name         TEXT NOT NULL,
    description  TEXT,
    trigger_json TEXT NOT NULL,
    steps_json   TEXT NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 1,
    last_run_at  INTEGER,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);

-- ─── plugins ──────────────────────────────────────────────────────────
CREATE TABLE plugins (
    id              TEXT PRIMARY KEY,               -- plg_<slug>
    manifest_json   TEXT NOT NULL,
    granted_caps    TEXT NOT NULL DEFAULT '[]',
    enabled         INTEGER NOT NULL DEFAULT 1,
    installed_at    INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- ─── telemetry (opt-in only) ──────────────────────────────────────────
CREATE TABLE telemetry_events (
    id           TEXT PRIMARY KEY,
    kind         TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    ts           INTEGER NOT NULL
);
```

## Migrations

Migrations are forward-only, named with a timestamp prefix
(`20260601_0001__init.sql`). Each migration ships an idempotent `up` script
and a guard that bails out if the schema version is already higher.

## Backup & sync

- Local backup: `.aether-backup/` directory with rotated SQLite snapshots.
- Sync: encrypted blobs uploaded to the user's chosen provider (iCloud,
  Drive, custom S3). Per-row CRDT (Yjs) is on the Beta roadmap.
