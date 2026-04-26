/**
 * VTID-01975: Vitana Intent Engine API client (P2-B).
 *
 * Wraps the gateway routes /api/v1/intents, /intent-matches, /intent-board,
 * /intent-categories. Used by Business Hub Opportunities/My Listings tabs
 * and the community-side IntentBoard / MyIntents / IntentComposer pages.
 */

import { communityFetch } from "./community-gateway";

export type IntentKind =
  | "commercial_buy"
  | "commercial_sell"
  | "activity_seek"
  | "partner_seek"
  | "social_seek"
  | "mutual_aid";

export interface UserIntent {
  intent_id: string;
  requester_user_id: string;
  requester_vitana_id: string | null;
  tenant_id: string;
  intent_kind: IntentKind;
  category: string | null;
  title: string;
  scope: string;
  kind_payload: Record<string, unknown>;
  visibility: "public" | "tenant" | "private" | "mutual_reveal";
  compass_alignment_at_post: string | null;
  status: "draft" | "open" | "matched" | "engaged" | "fulfilled" | "closed" | "cancelled";
  match_count: number;
  created_at: string;
  updated_at: string;
}

export interface IntentMatch {
  match_id: string;
  intent_a_id: string;
  intent_b_id: string | null;
  vitana_id_a: string | null;
  vitana_id_b: string | null;
  external_target_kind: string | null;
  external_target_id: string | null;
  kind_pairing: string;
  score: number;
  match_reasons: Record<string, unknown>;
  compass_aligned: boolean;
  state: string;
  created_at: string;
  redacted?: boolean; // server-side flag for partner_seek pre-reveal
}

export interface IntentCategory {
  kind_key: IntentKind;
  category_key: string;
  parent_key: string | null;
  label: string;
  sort_order: number;
}

interface PostIntentPayload {
  utterance?: string;
  intent_kind?: IntentKind;
  category?: string;
  title?: string;
  scope?: string;
  kind_payload?: Record<string, unknown>;
  visibility?: string;
}

export async function postIntent(payload: PostIntentPayload): Promise<{ intent_id: string; requester_vitana_id?: string; match_count?: number }> {
  const res = await communityFetch("/api/v1/intents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "post_failed" }));
    throw new Error(err.message || err.error || `Post intent failed (${res.status})`);
  }
  return res.json();
}

export async function listMyIntents(filters?: { kind?: IntentKind; status?: string }): Promise<UserIntent[]> {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  const res = await communityFetch(`/api/v1/intents${qs ? "?" + qs : ""}`);
  if (!res.ok) throw new Error(`List intents failed (${res.status})`);
  const data = await res.json();
  return data.intents ?? [];
}

export async function getIntent(intentId: string): Promise<UserIntent> {
  const res = await communityFetch(`/api/v1/intents/${intentId}`);
  if (!res.ok) throw new Error(`Get intent failed (${res.status})`);
  const data = await res.json();
  return data.intent;
}

export async function closeIntent(intentId: string): Promise<UserIntent> {
  const res = await communityFetch(`/api/v1/intents/${intentId}/close`, { method: "POST" });
  if (!res.ok) throw new Error(`Close intent failed (${res.status})`);
  const data = await res.json();
  return data.intent;
}

export async function getIntentMatches(intentId: string, limit = 5): Promise<IntentMatch[]> {
  const res = await communityFetch(`/api/v1/intents/${intentId}/matches?limit=${limit}`);
  if (!res.ok) throw new Error(`Get matches failed (${res.status})`);
  const data = await res.json();
  return data.matches ?? [];
}

export async function getIncomingMatches(limit = 50): Promise<IntentMatch[]> {
  const res = await communityFetch(`/api/v1/intent-matches/incoming?limit=${limit}`);
  if (!res.ok) throw new Error(`Get incoming matches failed (${res.status})`);
  const data = await res.json();
  return data.matches ?? [];
}

export async function getOutgoingMatches(limit = 50): Promise<IntentMatch[]> {
  const res = await communityFetch(`/api/v1/intent-matches/outgoing?limit=${limit}`);
  if (!res.ok) throw new Error(`Get outgoing matches failed (${res.status})`);
  const data = await res.json();
  return data.matches ?? [];
}

export async function transitionMatch(matchId: string, state: string): Promise<{ state: string }> {
  const res = await communityFetch(`/api/v1/intent-matches/${matchId}/state`, {
    method: "POST",
    body: JSON.stringify({ state }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `State transition failed (${res.status})`);
  }
  return res.json();
}

export async function declineMatch(matchId: string): Promise<{ state: string }> {
  const res = await communityFetch(`/api/v1/intent-matches/${matchId}/decline`, { method: "POST" });
  if (!res.ok) throw new Error(`Decline match failed (${res.status})`);
  return res.json();
}

// VTID-01976: Dispute API.
export type DisputeReasonCategory = "no_show" | "misrepresented" | "safety" | "payment" | "other";

export interface DisputeRow {
  dispute_id: string;
  match_id: string;
  raised_by: string;
  raised_by_vitana_id: string | null;
  counterparty_vitana_id: string | null;
  reason_category: DisputeReasonCategory;
  reason_detail: string;
  status: "open" | "investigating" | "resolved" | "dismissed" | "withdrawn";
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export async function raiseDispute(matchId: string, reason_category: DisputeReasonCategory, reason_detail: string): Promise<DisputeRow> {
  const res = await communityFetch(`/api/v1/intent-matches/${matchId}/dispute`, {
    method: "POST",
    body: JSON.stringify({ reason_category, reason_detail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Raise dispute failed (${res.status})`);
  }
  const data = await res.json();
  return data.dispute;
}

export interface BoardResponse {
  compass: string | null;
  kinds_shown: IntentKind[];
  intents: UserIntent[];
}

export async function getIntentBoard(filters?: { kind?: IntentKind; category?: string; limit?: number }): Promise<BoardResponse> {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const res = await communityFetch(`/api/v1/intent-board${qs ? "?" + qs : ""}`);
  if (!res.ok) throw new Error(`Intent board failed (${res.status})`);
  return res.json();
}

export async function getIntentCategories(kind?: IntentKind): Promise<IntentCategory[]> {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  const qs = params.toString();
  const res = await communityFetch(`/api/v1/intent-categories${qs ? "?" + qs : ""}`);
  if (!res.ok) throw new Error(`Categories failed (${res.status})`);
  const data = await res.json();
  return data.categories ?? [];
}
