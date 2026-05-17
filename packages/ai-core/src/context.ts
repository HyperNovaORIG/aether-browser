import type { AIMessage, Tab } from "@aether/shared";

/**
 * Context builder — assembles a structured system prompt that bundles the
 * user's current tab, workspace context and any retrieved memories into a
 * single `system` message. The renderer / agents call this before sending
 * requests through the orchestrator.
 */
export interface ContextInput {
  user?: { name?: string; locale?: string };
  workspace?: { name: string; description?: string };
  activeTab?: Tab;
  /** Compact list of other open tabs the user might want to reference. */
  openTabs?: Tab[];
  /** Retrieved long-term memories, in descending relevance order. */
  memories?: { text: string; tags: string[] }[];
  /** Optional ad-hoc instructions, e.g. "answer in Russian". */
  directives?: string[];
}

export function buildContextMessage(input: ContextInput): AIMessage {
  const lines: string[] = [
    "You are Aether — an AI companion embedded in a modern browser.",
    "Be concise, accurate, and helpful. Prefer markdown for formatting.",
    "Cite sources with links when you used the active tab or external info.",
  ];

  if (input.user?.name) lines.push(`User name: ${input.user.name}.`);
  if (input.user?.locale) lines.push(`User locale: ${input.user.locale}.`);

  if (input.workspace) {
    lines.push("");
    lines.push(`# Workspace: ${input.workspace.name}`);
    if (input.workspace.description) lines.push(input.workspace.description);
  }

  if (input.activeTab) {
    lines.push("");
    lines.push("# Active tab");
    lines.push(`Title: ${input.activeTab.title || "(untitled)"}`);
    lines.push(`URL: ${input.activeTab.url}`);
    if (input.activeTab.aiSummary) {
      lines.push("Summary:");
      lines.push(input.activeTab.aiSummary);
    }
  }

  if (input.openTabs?.length) {
    lines.push("");
    lines.push("# Other open tabs");
    for (const tab of input.openTabs.slice(0, 8)) {
      lines.push(`- ${tab.title || tab.url} (${tab.url})`);
    }
  }

  if (input.memories?.length) {
    lines.push("");
    lines.push("# Relevant memories");
    for (const memory of input.memories.slice(0, 12)) {
      lines.push(`- ${memory.text}`);
    }
  }

  if (input.directives?.length) {
    lines.push("");
    lines.push("# Directives");
    for (const d of input.directives) lines.push(`- ${d}`);
  }

  return { role: "system", content: lines.join("\n") };
}
