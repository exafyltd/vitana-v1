/**
 * VTID-03319 — news-feed-ranker regression tests.
 *
 * Pure Node ESM. Transpiles src/lib/news-feed-ranker.ts with esbuild (already a
 * Vite dependency) to a temp module, imports it, and exercises the REAL ranking
 * logic — not a string-grep. Covers the approved deterministic order: VIP-first
 * pinning, chronological non-VIP ordering (follow status no longer reorders),
 * public-news interleave, hide/mute, "show less" downrank, match cap +
 * seen-match exclusion, and tie-breaking by stable id.
 *
 * Invocation:
 *   npm run test:news-feed-ranker
 *   node scripts/news-feed-ranker-regression.mjs
 */
import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadRanker() {
  const out = await build({
    entryPoints: [resolve(repoRoot, "src/lib/news-feed-ranker.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
  });
  const dir = mkdtempSync(resolve(tmpdir(), "ranker-"));
  const file = resolve(dir, "ranker.mjs");
  writeFileSync(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href);
}

const failures = [];
function assert(cond, msg) {
  if (!cond) {
    failures.push(msg);
    console.error("  ✗ " + msg);
  } else {
    console.log("  ✓ " + msg);
  }
}

function post(id, over = {}) {
  return {
    id: `post-${id}`,
    kind: "post",
    post_id: id,
    user_id: `u-${id}`,
    author_name: id,
    author_avatar: null,
    content: id,
    image_url: null,
    video_url: null,
    likes_count: 0,
    comments_count: 0,
    followed: false,
    vip: false,
    tags: [],
    published_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}
function article(id, over = {}) {
  return {
    id: `article-${id}`,
    kind: "article",
    source_name: "RSS",
    title: id,
    summary: null,
    image_url: null,
    link: null,
    tags: [],
    published_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}
function match(id, over = {}) {
  return {
    id: `match-${id}`,
    kind: "match",
    user_id: id,
    display_name: id,
    avatar_url: null,
    match_reason: "",
    compatibility_score: 50,
    published_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}
function performer(id, over = {}) {
  return {
    id: `perf-${id}`,
    kind: "performer",
    user_id: id,
    display_name: id,
    avatar_url: null,
    improvement: 10,
    published_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

const { rankFeed, reasonKeyFor } = await loadRanker();

// §1 — Tier order: VIP post → match → performer → other post → article.
{
  const out = rankFeed([
    article("a"),
    post("other", { followed: false, published_at: "2026-06-02T00:00:00Z" }),
    // VIP but OLDEST — must still lead the whole feed.
    post("vip", { vip: true, published_at: "2026-05-01T00:00:00Z" }),
    performer("p"),
    match("m"),
  ]);
  assert(out[0].id === "post-vip", "§1 VIP post pinned first even when oldest");
  assert(out[1].kind === "match", "§1 match after VIP");
  assert(out[2].kind === "performer", "§1 performer after match");
  assert(out[3].id === "post-other", "§1 other post next");
  assert(out[4].kind === "article", "§1 public news after community posts");
}

// §2 — Non-VIP posts are purely chronological; follow status does NOT reorder.
{
  const out = rankFeed([
    post("oldFollowed", { followed: true, published_at: "2026-06-01T00:00:00Z" }),
    post("newStranger", { followed: false, published_at: "2026-06-10T00:00:00Z" }),
  ]);
  assert(out[0].id === "post-newStranger", "§2 newest non-VIP wins regardless of follow status");
  assert(out[1].id === "post-oldFollowed", "§2 older followed post comes second");
}

// §2b — A VIP author always beats a newer non-VIP post.
{
  const out = rankFeed([
    post("freshStranger", { published_at: "2026-06-20T00:00:00Z" }),
    post("vipOld", { vip: true, published_at: "2026-01-01T00:00:00Z" }),
  ]);
  assert(out[0].id === "post-vipOld", "§2b VIP outranks a much newer non-VIP post");
}

// §2c — Multiple VIPs are chronological among themselves, still ahead of all others.
{
  const out = rankFeed([
    post("stranger", { published_at: "2026-06-30T00:00:00Z" }),
    post("vipOlder", { vip: true, published_at: "2026-06-01T00:00:00Z" }),
    post("vipNewer", { vip: true, published_at: "2026-06-15T00:00:00Z" }),
  ]);
  assert(
    out.map((x) => x.id).join(",") === "post-vipNewer,post-vipOlder,post-stranger",
    "§2c VIPs newest-first, both ahead of newer non-VIP",
  );
}

// §3 — Within a follow group, newest wins regardless of media format.
{
  const out = rankFeed([
    post("newText", { followed: true, published_at: "2026-06-22T12:00:00Z" }),
    post("olderImage", {
      followed: true,
      image_url: "i.png",
      published_at: "2026-06-22T11:00:00Z",
    }),
    post("oldestVideo", {
      followed: true,
      video_url: "v.mp4",
      published_at: "2026-06-22T10:00:00Z",
    }),
  ]);
  assert(
    out.map((x) => x.id).join(",") === "post-newText,post-olderImage,post-oldestVideo",
    "§3 newest post wins regardless of media format",
  );
}

// §4 — Public news interleaved (1 per N), not all dumped last.
{
  const posts = Array.from({ length: 8 }, (_, k) => post(`p${k}`, { followed: true }));
  const arts = Array.from({ length: 3 }, (_, k) => article(`a${k}`));
  const out = rankFeed([...posts, ...arts], { articleInterleave: 4 });
  // After 4 community posts, an article appears at index 4.
  assert(out[4].kind === "article", "§4 article interleaved after 4 posts");
  assert(out.filter((x) => x.kind === "article").length === 3, "§4 all articles present");
}

// §5 — Hidden ids removed; muted article sources removed.
{
  const out = rankFeed(
    [post("keep", { followed: true }), post("drop", { followed: true }), article("mutedSrc", { source_name: "BadSrc" })],
    { hiddenIds: ["post-drop"], mutedSources: ["BadSrc"] },
  );
  const ids = out.map((x) => x.id);
  assert(!ids.includes("post-drop"), "§5 hidden id removed");
  assert(!ids.includes("article-mutedSrc"), "§5 muted source removed");
}

// §6 — "Show less" downranks tagged items within their group.
{
  const out = rankFeed(
    [
      post("tagged", { followed: true, tags: ["keto"], published_at: "2026-06-10T00:00:00Z" }),
      post("plain", { followed: true, tags: [], published_at: "2026-06-01T00:00:00Z" }),
    ],
    { downrankedTags: { keto: 3 } },
  );
  // Despite being newer, the downranked-tag post falls behind the plain one.
  assert(out[0].id === "post-plain", "§6 downranked tag demoted below newer plain post");
}

// §7 — Match cap + seen-match exclusion.
{
  const out = rankFeed([match("m1", { compatibility_score: 90 }), match("m2", { compatibility_score: 80 })]);
  assert(out.filter((x) => x.kind === "match").length === 1, "§7 only one match pinned by default");
  assert(out[0].id === "match-m1", "§7 highest-score match pinned");

  const out2 = rankFeed([match("seen", { compatibility_score: 90 }), match("new", { compatibility_score: 80 })], {
    seenMatchIds: ["match-seen"],
  });
  assert(out2[0]?.id === "match-new", "§7 seen match excluded from pinned slot");
}

// §8 — Deterministic: stable id tie-break, identical inputs → identical output.
{
  const items = [post("b", { followed: true }), post("a", { followed: true })];
  const r1 = rankFeed(items).map((x) => x.id);
  const r2 = rankFeed(items).map((x) => x.id);
  assert(JSON.stringify(r1) === JSON.stringify(r2), "§8 deterministic across runs");
  assert(r1[0] === "post-a", "§8 ties broken by stable id (a before b)");
}

// §9 — reasonKeyFor mapping.
{
  assert(reasonKeyFor(match("x")) === "screens.home.whyMatch", "§9 match reason key");
  assert(reasonKeyFor(performer("x")) === "screens.home.whySpotlight", "§9 performer reason key");
  assert(reasonKeyFor(post("x", { followed: true })) === "screens.home.whyFollowed", "§9 followed reason key");
  assert(reasonKeyFor(post("x", { followed: false })) === "screens.home.whyCommunity", "§9 community reason key");
  assert(reasonKeyFor(post("x", { vip: true })) === "screens.home.whyVip", "§9 vip reason key");
  assert(reasonKeyFor(post("x", { vip: true, followed: true })) === "screens.home.whyVip", "§9 vip outranks followed label");
  assert(reasonKeyFor(article("x")) === "screens.home.whyPublic", "§9 public reason key");
}

if (failures.length) {
  console.error(`\n✗ news-feed-ranker: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\n✓ news-feed-ranker: all checks passed");
