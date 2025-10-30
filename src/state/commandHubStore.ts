import { create } from "zustand";
import { Event, Filters, ChatThread } from "@/types/command-hub";

type State = {
  events: Event[];
  nextCursor?: string;
  filters: Filters;
  streaming: boolean;
  paused: boolean;
  activeVTID?: string;
  threads: Record<string, ChatThread>;
};

type Actions = {
  setPaused: (p: boolean) => void;
  setStreaming: (s: boolean) => void;
  setFilters: (f: Partial<Filters>) => void;
  setActiveVTID: (id?: string) => void;
  addEvents: (incoming: Event[]) => void;
  prependHistory: (older: Event[], nextCursor?: string) => void;
  upsertThread: (t: ChatThread) => void;
  appendChat: (vtid: string, item: ChatThread["items"][number]) => void;
};

export const useCommandHub = create<State & Actions>((set, get) => ({
  events: [],
  filters: { layer: "ALL", status: "ALL" },
  streaming: false,
  paused: false,
  threads: {},
  
  setPaused: (p) => set({ paused: p }),
  
  setStreaming: (s) => set({ streaming: s }),
  
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
  
  setActiveVTID: (id) => set({ activeVTID: id }),
  
  addEvents: (incoming) => set({ 
    events: dedupeSort([...incoming, ...get().events]) 
  }),
  
  prependHistory: (older, nextCursor) => set({
    events: dedupeSort([...get().events, ...older]),
    nextCursor
  }),
  
  upsertThread: (t) => set({ 
    threads: { ...get().threads, [t.vtid]: t } 
  }),
  
  appendChat: (vtid, item) => {
    const existing = get().threads[vtid]?.items ?? [];
    set({ 
      threads: { 
        ...get().threads, 
        [vtid]: { vtid, items: [...existing, item] } 
      } 
    });
  }
}));

function dedupeSort(arr: Event[]): Event[] {
  const seen = new Set<string>();
  const out: Event[] = [];
  
  for (const e of arr) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  
  return out.sort((a, b) => b.ts.localeCompare(a.ts)); // newest first
}
