import { Event, ChatThread, Filters } from "@/types/command-hub";

// Read from environment/config
const BASE_EVENTS = import.meta.env.VITE_EVENTS_BASE_URL || "/api/v1";
const BASE_OP = import.meta.env.VITE_OPERATOR_BASE_URL || "/api/v1";
const DEFAULT_H = Number(import.meta.env.VITE_DEFAULT_HISTORY_HOURS || 72);

export async function fetchEvents(opts: { 
  cursor?: string; 
  filters?: Filters; 
  limit?: number 
} = {}) {
  const params = new URLSearchParams();
  
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.filters?.vtid) params.set("vtid", opts.filters.vtid);
  
  if (opts.filters?.layer && opts.filters.layer !== "ALL") {
    params.set("layer", String(opts.filters.layer));
  }
  
  if (opts.filters?.status && opts.filters.status !== "ALL") {
    params.set("status", String(opts.filters.status));
  }
  
  params.set("hours", String(DEFAULT_H));
  
  const r = await fetch(`${BASE_EVENTS}/events?${params}`, { 
    credentials: "include" 
  });
  
  if (!r.ok) throw new Error(`Events fetch failed: ${r.status}`);
  
  return r.json() as Promise<{ items: Event[]; next_cursor?: string }>;
}

export async function fetchThread(vtid: string) {
  const r = await fetch(
    `${BASE_OP}/chat/thread?vtid=${encodeURIComponent(vtid)}`, 
    { credentials: "include" }
  );
  
  if (!r.ok) {
    if (r.status === 404) {
      // No thread history yet - return empty thread
      return { vtid, items: [] } as ChatThread;
    }
    throw new Error(`Thread fetch failed: ${r.status}`);
  }
  
  return r.json() as Promise<ChatThread>;
}

export async function postChat(body: { 
  message: string; 
  vtid?: string; 
  topic?: string; 
  urgency?: "low" | "normal" | "high" 
}) {
  const r = await fetch(`${BASE_OP}/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!r.ok) {
    if (r.status === 401) {
      throw new Error("Session expired—please sign in");
    }
    throw new Error(`Chat post failed: ${r.status}`);
  }
  
  return r.json() as Promise<{ 
    vtid: string; 
    reply: string; 
    followups?: string[]; 
    links?: { label: string; href: string }[] 
  }>;
}
