/**
 * VTID-05297 — the pure, deterministic "All News" ranker and its feed-item
 * types (src/lib/news-feed-ranker.ts): rankFeed, the FeedItem union and
 * FeedItemKind, motivationKeyFor. (reasonKeyFor is deferred to the FEAT that
 * renders the "why" label: its web switch is not exhaustive over FeedItem —
 * no `new_member` case — so a verbatim extract fails the native strict
 * noImplicitReturns; that lane resolves the missing case properly.)
 *
 * Generated verbatim through packages/core/extract.json, NOT `export * from
 * '@/lib/news-feed-ranker'`: the web file's `import type { MatchReason }` /
 * `import type { PostAttachedRef }` reach the class-B src/lib/matchReason.ts /
 * src/lib/post-attachment.ts (runtime supabase / i18n imports that use
 * import.meta), which must never enter the native strict TS program. The
 * generator reproduces the two type shapes inline as stubs (extract.json), so
 * the native feed keeps correct typing with zero web class-B coupling. Home's
 * native feed ranks the same way the web does.
 */
export * from './extracted/news-feed-ranker.generated';
