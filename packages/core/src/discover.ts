/**
 * VTID-05510 — the pure Discover / shop helpers (IO-free): the recommendation
 * badge rule and subcategory map (src/lib/discover-reason.ts), the EUR display
 * price (useMarketplace.ts formatPrice + src/lib/currency-convert.ts), the
 * thematic-collection config (CategoryShopSections.tsx SECTION_CONFIGS), the
 * mobile category chips (MobileDiscoverView.tsx categoryConfig), the cart's
 * product-id rule (AddToCartButton.tsx UUID_RE) and the shop feed constants
 * (ShopFeed.tsx HOLD_THRESHOLD_MS, useShopFeed.ts query keys and batching).
 *
 * Generated verbatim through packages/core/extract.json (NOT `export * from`
 * the web files): every source file also holds React components or runtime
 * imports of class-B modules (the web Supabase client, the community gateway,
 * the web `t()`), so only the named pure declarations are copied. The native
 * Discover lane re-implements the data hooks over the native clients.
 */
export * from './extracted/discover.generated';
