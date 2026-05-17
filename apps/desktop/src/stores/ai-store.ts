import { create } from "zustand";
import { api } from "@/lib/aether-api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** True while the assistant message is streaming. */
  streaming: boolean;
  createdAt: number;
}

interface AIState {
  messages: ChatMessage[];
  busy: boolean;
  send(prompt: string): Promise<void>;
  reset(): void;
}

let counter = 0;
const id = (): string => `msg_${Date.now()}_${counter++}`;

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  busy: false,

  async send(prompt) {
    if (!prompt.trim() || get().busy) return;
    const userMsg: ChatMessage = { id: id(), role: "user", content: prompt, streaming: false, createdAt: Date.now() };
    const assistantMsg: ChatMessage = { id: id(), role: "assistant", content: "", streaming: true, createdAt: Date.now() };
    set((state) => ({ messages: [...state.messages, userMsg, assistantMsg], busy: true }));

    try {
      const messages = get()
        .messages.filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));
      const { streamId } = await api().ai.stream({
        messages: [...messages, { role: "user", content: prompt }],
        capability: "chat",
        stream: true,
      });

      const off = api().stream.on(streamId, (chunk) => {
        const c = chunk as { kind: string; content?: string; error?: { message: string } };
        if (c.kind === "delta" && c.content) {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + c.content } : m,
            ),
          }));
        } else if (c.kind === "done") {
          set((state) => ({
            busy: false,
            messages: state.messages.map((m) => (m.id === assistantMsg.id ? { ...m, streaming: false } : m)),
          }));
          off();
        } else if (c.kind === "error") {
          set((state) => ({
            busy: false,
            messages: state.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, streaming: false, content: m.content + `\n\n_⚠️ ${c.error?.message ?? "Unknown error"}_` }
                : m,
            ),
          }));
          off();
        }
      });
    } catch (error) {
      set((state) => ({
        busy: false,
        messages: state.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, streaming: false, content: `⚠️ ${error instanceof Error ? error.message : "Unknown error"}` }
            : m,
        ),
      }));
    }
  },

  reset() {
    set({ messages: [], busy: false });
  },
}));
