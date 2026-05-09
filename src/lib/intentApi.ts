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
  // E6 follow-up — landscape cover photo, used as the banner on
  // match preview cards and at the top of My Posts cards. Optional;
  // until the backend ships a dedicated column, we transit it
  // through `kind_payload.cover_url` and `getIntentCoverUrl()`
  // resolves whichever is set.
  cover_url?: string | null;
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
  // E6 — counterparty profile fields (populated by gateway intent-match-enrich).
  // null when redacted, when the counterparty is hidden, or when the field is unset.
  partner_display_name?: string | null;
  partner_avatar_url?: string | null;
  partner_gender?: 'male' | 'female' | null;
  // E6 — Find a Match cover image. Distinct from the avatar: this is
  // a landscape cover photo the user uploads (or an AI-generated
  // themed dance/fitness image) sized for the match preview card.
  // Optional — when absent, the card renders a themed gradient fallback.
  partner_match_cover_url?: string | null;
  // E6 follow-up — counterparty intent fields surfaced by
  // intent-match-enrich so the match card body can read like the
  // counterparty's own My Posts card (kind pill + title + scope).
  // All optional: the card has graceful fallbacks while backend
  // catches up.
  partner_intent_title?: string | null;
  partner_intent_scope?: string | null;
  partner_intent_kind?: IntentKind | string | null;
  partner_intent_status?: string | null;
  // Last-seen timestamp for the partner. ISO string when present; the
  // card renders a "Active today" / "Active recently" pill from it.
  // Hidden on partner_seek redaction.
  partner_last_active_at?: string | null;
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
  surface?: string;
  intents: UserIntent[];
}

export type IntentSurface = 'default' | 'find_a_partner';

export async function getIntentBoard(filters?: {
  kind?: IntentKind;
  category?: string;
  /** Comma-joined list. Each entry can be exact (`activity_seek`) or a prefix (`dance.*`). */
  categories?: string[];
  /** E6 — when 'find_a_partner', server skips partner_seek redaction. */
  surface?: IntentSurface;
  limit?: number;
}): Promise<BoardResponse> {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.categories && filters.categories.length > 0) {
    params.set("categories", filters.categories.join(","));
  }
  if (filters?.surface) params.set("surface", filters.surface);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const res = await communityFetch(`/api/v1/intent-board${qs ? "?" + qs : ""}`);
  if (!res.ok) throw new Error(`Intent board failed (${res.status})`);
  return res.json();
}

/**
 * E6 — count of community members (respects global_community_profiles.is_visible).
 * Powers the Find a Partner Members tab gate (visible only while total ≤ 1000).
 */
export async function getCommunityMemberCount(): Promise<number> {
  const res = await communityFetch(`/api/v1/community/members/count`);
  if (!res.ok) throw new Error(`Members count failed (${res.status})`);
  const data = await res.json();
  return typeof data.total === 'number' ? data.total : 0;
}

/**
 * E6 — fetch all matches across the user's open dance.* + fitness.* intents.
 * Merges per-intent matches into a single sorted list; tags each row with
 * the source intent's category so the UI can show a 💃 Dance / 💪 Fitness chip.
 */
export interface FindPartnerMatch extends IntentMatch {
  source_intent_id: string;
  source_category: string | null;
  /** 'dance' | 'fitness' | null — derived from the source category prefix. */
  vertical: 'dance' | 'fitness' | null;
}

function verticalFromCategory(cat: string | null): 'dance' | 'fitness' | null {
  if (!cat) return null;
  if (cat.startsWith('dance.')) return 'dance';
  if (cat.startsWith('fitness.')) return 'fitness';
  return null;
}

/**
 * Cap on the number of source intents we fan-out match requests for.
 * Without it, a power user (especially providers with many open
 * listings) would trigger one /matches HTTP call per open intent —
 * enough to swamp the gateway and leave this tab waiting on dozens of
 * parallel responses. We rely on the gateway's default sort (most
 * recently active first) so the cap drops the *least* relevant
 * sources, and any per-intent matches the user is missing here are
 * still reachable via that intent's detail page.
 */
const FIND_PARTNER_MAX_SOURCE_INTENTS = 20;

export async function getFindPartnerMatches(perIntentLimit = 5): Promise<FindPartnerMatch[]> {
  // Fetch matches across the user's open intents — not just
  // dance.* / fitness.* — so posts created via the generic +New wish
  // composer (which doesn't tag a category) still surface their
  // matches here. The card falls back to the 'default' theme when
  // `vertical` is null, so non-dance/fitness sources render fine.
  const mine = await listMyIntents({ status: 'open' });
  if (mine.length === 0) return [];
  const sources = mine.slice(0, FIND_PARTNER_MAX_SOURCE_INTENTS);

  const matches = await Promise.all(
    sources.map(async (it) => {
      try {
        const rows = await getIntentMatches(it.intent_id, perIntentLimit);
        return rows.map((m): FindPartnerMatch => ({
          ...m,
          source_intent_id: it.intent_id,
          source_category: it.category,
          vertical: verticalFromCategory(it.category),
        }));
      } catch {
        return [] as FindPartnerMatch[];
      }
    })
  );

  return matches.flat().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
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
