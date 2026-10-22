/**
 * VTID-05297 — pure feed composition (src/lib/feed-compose.ts): composeFeed,
 * withHomeNewCards, placementOf, splitByPlacement and the ComposedEntry /
 * FeedPlacement types. IO-free.
 *
 * Generated verbatim through packages/core/extract.json (NOT `export * from
 * '@/lib/feed-compose'`): the web file `import type`s FeedItem/FeedItemKind
 * from news-feed-ranker, whose own type-only cross-imports reach class-B web
 * files; routing both through the extractor keeps every web class-B file out
 * of the native strict TS program. Home's native feed composes the same way
 * the web does.
 */
export * from './extracted/feed-compose.generated';
