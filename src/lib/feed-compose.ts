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
 */
import type { FeedItem } from "@/lib/news-feed-ranker";

export type ComposedEntry<V> =
  | { type: "vitana"; card: V }
  | { type: "item"; item: FeedItem; role: "info" | "stream" };

export function composeFeed<V>(ranked: FeedItem[], vitanaCards: V[]): ComposedEntry<V>[] {
  const feature = ranked.find((i) => i.kind === "feature_announcement");
  const member = ranked.find((i) => i.kind === "new_member");

  // Info queue, in display order. Vitana cards are indexed by their slot.
  const queue: ComposedEntry<V>[] = [];
  const vitana = (n: number) => (vitanaCards[n] !== undefined ? ({ type: "vitana", card: vitanaCards[n] } as const) : null);
  const push = (e: ComposedEntry<V> | null) => {
    if (e) queue.push(e);
  };
  push(vitana(0));
  if (feature) push({ type: "item", item: feature, role: "info" });
  push(vitana(1));
  if (member) push({ type: "item", item: member, role: "info" });
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
    if (at >= 0) out.push({ type: "item", item: stream.splice(at, 1)[0], role: "stream" });
  }
  for (const item of stream) out.push({ type: "item", item, role: "stream" });
  return out;
}
