import { create } from "zustand";

interface PaletteState {
  open: boolean;
  query: string;
  toggle(): void;
  show(): void;
  hide(): void;
  setQuery(value: string): void;
}

export const usePaletteStore = create<PaletteState>((set) => ({
  open: false,
  query: "",
  toggle: () => set((s) => ({ open: !s.open })),
  show: () => set({ open: true }),
  hide: () => set({ open: false, query: "" }),
  setQuery: (value) => set({ query: value }),
}));
