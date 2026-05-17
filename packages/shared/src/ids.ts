import { randomUUID } from "node:crypto";

/**
 * Prefixed ULID-like identifiers. We use UUIDv4 under the hood but
 * tag them with a short prefix for readability and debuggability.
 *
 * Example: `tab_8f0a4c6f-...`, `wks_2c8d...`
 */
export type PrefixedId<Prefix extends string> = `${Prefix}_${string}`;

const PREFIXES = {
  workspace: "wks",
  tab: "tab",
  profile: "prf",
  agent: "agt",
  task: "tsk",
  message: "msg",
  memory: "mem",
  plugin: "plg",
  automation: "atm",
  session: "ses",
  user: "usr",
} as const;

export type EntityKind = keyof typeof PREFIXES;

export function newId<K extends EntityKind>(kind: K): PrefixedId<(typeof PREFIXES)[K]> {
  return `${PREFIXES[kind]}_${randomUUID()}` as PrefixedId<(typeof PREFIXES)[K]>;
}

export function isId<K extends EntityKind>(kind: K, value: unknown): value is PrefixedId<(typeof PREFIXES)[K]> {
  return typeof value === "string" && value.startsWith(`${PREFIXES[kind]}_`);
}
