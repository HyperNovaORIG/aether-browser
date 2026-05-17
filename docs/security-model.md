# Aether Security Model

Aether ships with a strong default: **the user's data never leaves the
device unless they explicitly opt in**.

## Threat model

We protect against:

- Malicious websites attempting to escape the sandbox.
- Malicious or buggy plugins.
- Compromised provider API keys.
- Local attackers reading files at rest.
- Network attackers MITM-ing provider calls.

Out of scope: nation-state-grade attackers with code execution on the host
OS. Aether's encryption at rest assumes the OS keychain is intact.

## Renderer hardening

- `webPreferences.sandbox = true` for all `<webContents>`.
- `contextIsolation = true`, `nodeIntegration = false`, `webviewTag = false`.
- No `remote` module (we never use `@electron/remote`).
- Preload exposes only the typed `aether` object via `contextBridge`.
- `setWindowOpenHandler` denies `window.open` calls, defers to `shell.openExternal`.
- `will-navigate` blocked for non-http(s) URLs.
- `setPermissionRequestHandler` allow-lists only clipboard-read, fullscreen,
  notifications. Geolocation / media / midi / etc. are denied by default.
- CSP forbids `unsafe-eval` and limits `connect-src` to a known set of API
  hosts plus the localhost gateway.

## IPC

- Every channel goes through `ipcMain.handle` (request/response only — no
  one-way `webContents.send` calls from untrusted senders).
- Every payload is validated with a zod schema in `apps/desktop/electron/ipc.ts`.
- IPC handlers return structured-cloneable objects only — never `Error`
  instances (we convert to `{ code, message, meta }` for the renderer).

## Profile isolation

Each browser profile maps to a unique `session.partition` (`persist:prf_*`).
Cookies, cache, IndexedDB, service workers and localStorage are scoped per
partition. Switching profile is a single Electron call; there is no shared
state across profiles.

## Plugin capabilities

Plugins ship a manifest declaring required capabilities (see
`plugin-sdk-spec.md`). When the user installs:

1. The manifest is validated against `PluginManifestSchema`.
2. The user sees a human-readable consent screen.
3. The user grants a subset of capabilities (or all).
4. The host stores granted caps in the `plugins.granted_caps` table.

At runtime, every privileged SDK call checks the plugin's `PermissionSet`
before executing. Plugin code runs in a dedicated `utilityProcess`, with no
file-system access except a per-plugin sandbox directory.

## Encryption at rest

- SQLite database encrypted with SQLCipher (AES-256 in CBC mode).
- Key derived from a passphrase stored in the OS keychain via
  `safeStorage.encryptString` (Keychain on macOS, DPAPI on Windows,
  libsecret on Linux).
- Memory blobs encrypted with `AES-256-GCM` (see `@aether/memory/crypto`)
  with scrypt key derivation and a per-record IV.

## Network

- All provider calls go through `node-fetch` with TLS 1.3 enforced and
  certificate pinning for `api.openai.com` and `api.anthropic.com` in Pro.
- Local Ollama defaults to `http://127.0.0.1:11434` only — never accepts
  remote URLs.
- The desktop app refuses to send AI calls when `Local Mode` is on.

## Telemetry

- **Off by default.** Users opt in from Settings → Privacy.
- Anonymous (no user id, no URLs).
- Aggregated client-side and sent in batches with random jitter.
- Source code reproducible from `services/telemetry-sink`.

## Anti-fingerprinting (post-MVP)

- Spoof `navigator.userAgent` per profile.
- Normalize `screen.*`, `canvas` and `WebGL` exposed shapes.
- Block third-party cookies by default.
- Optional Tor bridging for Private workspaces.

## Vulnerability disclosure

`security@aether.app` — 90 day disclosure window. Bug bounty post-Beta.
