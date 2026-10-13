/**
 * VTID-04973 — final order of the News "All" feed: info cards alternate with
 * the stream, starting with an info card —
 *   info card, user post, info card, user post, …
 *
 * Pure and IO-free. It runs AFTER `rankFeed` (which is unchanged): it takes the
 * ranked, flat list and the Vitana cards the page renders, and decides where
 * each goes. Community posts always keep priority: only ONE feature
 * announcement and ONE new-member card join the alternation; any further ones
 * stay in the stream at their ranked position, so they never crowd out posts.
 *
 * Info-card order: Vitana Index, "Did you know?"/new-feature card, Guided
 * Journey, new-member card, Invite friends, Find-a-match.
 *
 * A Vitana card that renders nothing (dismissed/ineligible) is invisible to
 * this function — the card components decide that themselves — so while one is
 * absent the viewer sees two stream items in a row for that slot. That is the
 * accepted trade-off: posts are never withheld to keep a pattern.
 *
 * VTID-05108 — every entry also carries a `placement`. The phone feed and the
 * legacy desktop grid ignore it and render the list in order (unchanged). The
 * desktop Spotlight focus feed uses it: `stream` entries are the content the
 * stage shows (posts, news articles); `rail` entries are the info cards
 * (Vitana cards, feature announcements / did-you-know, new members, matches,
 * most-improved members), which move into the context rail.
 */
import type { FeedItem, FeedItemKind } from "@/lib/news-feed-ranker";

export type FeedPlacement = "stream" | "rail";

export type ComposedEntry<V> =
  | { type: "vitana"; card: V; placement: FeedPlacement }
  | { type: "item"; item: FeedItem; role: "info" | "stream"; placement: FeedPlacement };

/** Feed kinds that are info cards, not content — on desktop Spotlight they live in the rail. */
export const RAIL_KINDS: ReadonlySet<FeedItemKind> = new Set<FeedItemKind>([
  "feature_announcement",
  "new_member",
  "match",
  "performer",
]);

/** Where a ranked feed item belongs on desktop Spotlight. */
export function placementOf(item: FeedItem): FeedPlacement {
  return RAIL_KINDS.has(item.kind) ? "rail" : "stream";
}

/** Splits a composed feed by placement, keeping the composed order inside each part. */
export function splitByPlacement<V>(entries: ComposedEntry<V>[]): {
  stream: ComposedEntry<V>[];
  rail: ComposedEntry<V>[];
} {
  const stream: ComposedEntry<V>[] = [];
  const rail: ComposedEntry<V>[] = [];
  for (const e of entries) (e.placement === "rail" ? rail : stream).push(e);
  return { stream, rail };
}

export function composeFeed<V>(ranked: FeedItem[], vitanaCards: V[]): ComposedEntry<V>[] {
  const feature = ranked.find((i) => i.kind === "feature_announcement");
  const member = ranked.find((i) => i.kind === "new_member");

  // Info queue, in display order. Vitana cards are indexed by their slot.
  const queue: ComposedEntry<V>[] = [];
  const vitana = (n: number): ComposedEntry<V> | null =>
    vitanaCards[n] !== undefined ? { type: "vitana", card: vitanaCards[n], placement: "rail" } : null;
  const push = (e: ComposedEntry<V> | null) => {
    if (e) queue.push(e);
  };
  push(vitana(0));
  if (feature) push({ type: "item", item: feature, role: "info", placement: "rail" });
  push(vitana(1));
  if (member) push({ type: "item", item: member, role: "info", placement: "rail" });
  push(vitana(2));
  push(vitana(3));
  for (let n = 4; n < vitanaCards.length; n++) push(vitana(n));

  const stream = ranked.filter((i) => i !== feature && i !== member);
  // A further feature/new-member card left in the stream is itself an info
  // card: it must never be the item that follows another info card.
  const isInfoKind = (i: FeedItem) => i.kind === "feature_announcement" || i.kind === "new_member";

  const out: ComposedEntry<V>[] = [];
  for (const entry of queue) {
    out.push(entry);
    const at = stream.findIndex((i) => !isInfoKind(i));
    if (at >= 0) {
      const item = stream.splice(at, 1)[0];
      out.push({ type: "item", item, role: "stream", placement: placementOf(item) });
    }
  }
  for (const item of stream) out.push({ type: "item", item, role: "stream", placement: placementOf(item) });
  return out;
}

/**
 * VTID-05085 — Home takes at most this many NEW Unified Card System cards
 * (top 2 open enrichment cards now, plus 1 boost card in Phase 3).
 */
export const HOME_NEW_CARD_CAP = 3;

/**
 * Put the new cards in front of Home's existing Vitana cards, capped at
 * HOME_NEW_CARD_CAP. The existing cards keep their order. Runs in Home.tsx
 * BEFORE composeFeed, so composeFeed itself is unchanged.
 */
export function withHomeNewCards<V>(newCards: V[], existingCards: V[], cap: number = HOME_NEW_CARD_CAP): V[] {
  return [...newCards.slice(0, Math.max(0, cap)), ...existingCards];
}
