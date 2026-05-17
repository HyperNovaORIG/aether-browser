import { create } from "zustand";
import type { AgentTask } from "@aether/shared";
import { api } from "@/lib/aether-api";

export interface AgentDescriptor {
  kind: string;
  name: string;
  description: string;
  icon: string;
}

interface AgentsState {
  agents: AgentDescriptor[];
  tasks: AgentTask[];
  load(): Promise<void>;
  run(input: { kind: string; prompt: string }): Promise<void>;
  upsertTask(task: AgentTask): void;
}

export const useAgentsStore = create<AgentsState>((set) => ({
  agents: [],
  tasks: [],

  async load() {
    const [agents, tasks] = await Promise.all([api().agents.list(), api().agents.listTasks()]);
    set({ agents, tasks });
  },

  async run(input) {
    const task = await api().agents.run(input);
    set((state) => ({ tasks: [task, ...state.tasks] }));
  },

  upsertTask(task) {
    set((state) => {
      const existing = state.tasks.findIndex((t) => t.id === task.id);
      if (existing === -1) return { tasks: [task, ...state.tasks] };
      const next = [...state.tasks];
      next[existing] = task;
      return { tasks: next };
    });
  },
}));
