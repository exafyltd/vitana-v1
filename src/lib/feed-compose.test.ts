import { describe, it, expect } from "vitest";
import type { FeedItem } from "@/lib/news-feed-ranker";
import { composeFeed } from "./feed-compose";

const item = (id: string, kind: string) => ({ id, kind, published_at: "2026-10-08T00:00:00Z" }) as unknown as FeedItem;
const post = (n: number) => item(`post-${n}`, "post");
const article = (n: number) => item(`article-${n}`, "article");
const feat = (n: number) => item(`feat-${n}`, "feature_announcement");
const mem = (n: number) => item(`mem-${n}`, "new_member");
const cards = ["index", "journey", "invite", "match"];

const label = (e: ReturnType<typeof composeFeed<string>>[number]) => (e.type === "vitana" ? e.card : e.item.id);

describe("composeFeed (VTID-04973)", () => {
  it("starts with an info card and strictly alternates info card / stream item", () => {
    const out = composeFeed([post(1), post(2), post(3), post(4), post(5), post(6), post(7)], cards);
    expect(out.map(label)).toEqual(["index", "post-1", "journey", "post-2", "invite", "post-3", "match", "post-4", "post-5", "post-6", "post-7"]);
  });

  it("places the did-you-know card second and the new-member card fourth", () => {
    const out = composeFeed([feat(1), mem(1), post(1), post(2), post(3), post(4), post(5), post(6)], cards);
    expect(out.map(label)).toEqual(["index", "post-1", "feat-1", "post-2", "journey", "post-3", "mem-1", "post-4", "invite", "post-5", "match", "post-6"]);
  });

  it("never lets non-post cards bunch at the top, even when they are the newest items", () => {
    const out = composeFeed([feat(1), mem(1), mem(2), post(1), post(2), post(3), post(4)], cards);
    const kinds = out.map((e) => (e.type === "vitana" || (e.type === "item" && (e.item.kind === "feature_announcement" || e.item.kind === "new_member")) ? "info" : "other"));
    // while posts remain (up to the last non-info entry) no two info cards touch
    const last = kinds.lastIndexOf("other");
    for (let i = 1; i <= last; i++) expect(kinds[i] === "info" && kinds[i - 1] === "info").toBe(false);
  });

  it("never puts a further feature/new-member card straight after an info card (staging regression)", () => {
    const ranked = [feat(1), post(1), article(1), feat(2), mem(1), mem(2), post(2), post(3), post(4), post(5)];
    const out = composeFeed(ranked, cards);
    const isInfo = (e: (typeof out)[number]) =>
      e.type === "vitana" || (e.type === "item" && (e.item.kind === "feature_announcement" || e.item.kind === "new_member"));
    // while non-info entries remain, no two info cards touch (once only info
    // cards are left there is nothing to put between them)
    const last = out.map(isInfo).lastIndexOf(false);
    for (let i = 1; i <= last; i++) expect(isInfo(out[i]) && isInfo(out[i - 1]), `${i - 1},${i}: ${out.map(label).join(",")}`).toBe(false);
    // nothing is dropped
    expect(out.map(label).sort()).toEqual([...ranked.map((r) => r.id), ...cards].sort());
  });

  it("keeps posts first in priority: extra new-member and feature cards stay in the stream", () => {
    const out = composeFeed([mem(1), mem(2), feat(1), feat(2), post(1)], cards);
    const ids = out.map(label);
    expect(ids).toContain("mem-2");
    expect(ids).toContain("feat-2");
    // only the first of each joins the alternation (info role)
    const infoItems = out.filter((e) => e.type === "item" && e.role === "info").map(label);
    expect(infoItems).toEqual(["feat-1", "mem-1"]);
  });

  it("keeps public-news articles in the stream where the ranker put them", () => {
    const out = composeFeed([post(1), post(2), article(1), post(3)], ["index"]);
    expect(out.map(label)).toEqual(["index", "post-1", "post-2", "article-1", "post-3"]);
  });

  it("with no stream items the info cards come out alone, in order", () => {
    expect(composeFeed([], cards).map(label)).toEqual(cards);
  });

  it("with fewer Vitana cards than expected (no match) skips the missing slot", () => {
    const out = composeFeed([post(1), post(2), post(3), post(4), post(5)], ["index", "journey", "invite"]);
    expect(out.map(label)).toEqual(["index", "post-1", "journey", "post-2", "invite", "post-3", "post-4", "post-5"]);
  });

  it("is pure: same input, same output, input untouched", () => {
    const input = [feat(1), post(1), post(2)];
    const copy = [...input];
    expect(composeFeed(input, cards).map(label)).toEqual(composeFeed(input, cards).map(label));
    expect(input).toEqual(copy);
  });
});
