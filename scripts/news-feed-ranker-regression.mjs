/**
 * VTID-03319 — news-feed-ranker regression tests.
 *
 * Pure Node ESM. Transpiles src/lib/news-feed-ranker.ts with esbuild (already a
 * Vite dependency) to a temp module, imports it, and exercises the REAL ranking
 * logic — not a string-grep. Covers the approved deterministic order, follow-
 * before-format, public-news interleave, hide/mute, "show less" downrank,
 * match cap + seen-match exclusion, and tie-breaking by stable id.
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

// §1 — Tier order: match → performer → followed post → other post → article.
{
  const out = rankFeed([
    article("a"),
    post("other", { followed: false }),
    post("followed", { followed: true }),
    performer("p"),
    match("m"),
  ]);
  const kinds = out.map((i) => i.kind);
  assert(kinds[0] === "match", "§1 match is pinned first");
  assert(kinds[1] === "performer", "§1 performer is second");
  assert(out[2].id === "post-followed", "§1 followed post before other post");
  assert(out[3].id === "post-other", "§1 other post next");
  assert(kinds[4] === "article", "§1 public news after community posts");
}

// §2 — Follow status outranks media format (followed text beats stranger video).
{
  const out = rankFeed([
    post("strangerVideo", { followed: false, video_url: "v.mp4" }),
    post("followedText", { followed: true }),
  ]);
  assert(out[0].id === "post-followedText", "§2 followed text beats stranger video");
}

// §3 — Within a follow group, video > image > text.
{
  const out = rankFeed([
    post("t", { followed: true }),
    post("i", { followed: true, image_url: "i.png" }),
    post("v", { followed: true, video_url: "v.mp4" }),
  ]);
  assert(
    out.map((x) => x.id).join(",") === "post-v,post-i,post-t",
    "§3 video then image then text within group",
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
  assert(reasonKeyFor(article("x")) === "screens.home.whyPublic", "§9 public reason key");
}

if (failures.length) {
  console.error(`\n✗ news-feed-ranker: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\n✓ news-feed-ranker: all checks passed");
