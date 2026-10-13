import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Share2, Sparkles, Stethoscope, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VCardSkeleton } from '@/components/ui/vcard';
import { discoverPrice, recommendationToVCard } from '@/components/ui/vcard/adapters';
import { HiddenByLimitationsFooter } from '@/components/discover/HiddenByLimitationsFooter';
import { AffiliateDisclosure } from '@/components/discover/AffiliateDisclosure';
import {
  useMarketplaceFeed,
  useMarketplaceSearch,
  useMyRecommendations,
  type MarketplaceProduct,
} from '@/hooks/useMarketplace';
import { fmtNumber } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
import { DataVCard, DiscoverShelf, ProductGrid, ProductHero } from './DiscoverCards';
import { Chip, ChipBar } from './DiscoverChips';
import { DiscoverEmpty, DiscoverError, DiscoverGridSkeleton } from './DiscoverStates';
import { DiscoverQuickViewSheet, type QuickViewItem } from './DiscoverQuickViewSheet';
import { useDebouncedValue } from './useDebouncedValue';
import {
  DEALS_SEARCH,
  DISCOVER_GRID,
  GOAL_CHIPS,
  NO_FILTERS,
  PRICE_CHIP_MAX_CENTS,
  RATING_CHIP_MIN,
  SHELF_SIZE,
  buildStorefrontSearch,
  hasActiveFilters,
  isResultsMode,
  realDeals,
  type GoalChipId,
  type StorefrontFilters,
} from './storefront-model';

/**
 * VTID-05109 — Discover overview as a storefront (requirement R5.2):
 *   filter chips → ONE hero `spotlight` ("Picked for you", the member's real
 *   marketplace feed) → shelves of `standard` cards with "See all" → Share &
 *   Earn shelf (the member's own Recommend & Earn links, or an empty state).
 * Search text or any chip switches to results from the existing gateway
 * search, with the top result as the hero.
 *
 * Honesty (SR-24): every card and number comes from the gateway. Wellness
 * services and doctors/coaches have no real catalog yet, so their shelves are
 * empty states that point at their sections — never sample items.
 */
export interface DiscoverStorefrontProps {
  /** Text from the utility-bar search pill (owned by the page). */
  query: string;
  onClearQuery: () => void;
  isGuest: boolean;
  onSignIn: () => void;
  /** `?tab=share` deep link (gateway navigation catalog) scrolls to the Share & Earn shelf. */
  initialSection?: string | null;
}

export function DiscoverStorefront({ query, onClearQuery, isGuest, onSignIn, initialSection }: DiscoverStorefrontProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<StorefrontFilters>(NO_FILTERS);
  const [quick, setQuick] = useState<QuickViewItem | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);
  const resultsMode = isResultsMode(debouncedQuery, filters);
  const openProduct = useCallback((product: MarketplaceProduct) => setQuick({ kind: 'product', product }), []);

  // The feed and deals queries use the same keys as the legacy overview / Deals pages, so their caches are shared.
  const feed = useMarketplaceFeed({ limit: 12 });
  const supplements = useMarketplaceSearch({ category: 'supplements', sort: 'relevance', limit: 8 }, { enabled: !resultsMode });
  const deals = useMarketplaceSearch(DEALS_SEARCH, { enabled: !resultsMode });
  const searchParams = useMemo(() => buildStorefrontSearch(debouncedQuery, filters), [debouncedQuery, filters]);
  const results = useMarketplaceSearch(searchParams, { enabled: resultsMode });
  const myRecs = useMyRecommendations({ enabled: !isGuest });

  useEffect(() => {
    if (initialSection !== 'share') return;
    const id = window.setTimeout(() => {
      document.querySelector('[data-discover-shelf="share"]')?.scrollIntoView({ block: 'start' });
    }, 300);
    return () => window.clearTimeout(id);
  }, [initialSection]);

  const toggleGoal = (goal: GoalChipId) => setFilters((f) => ({ ...f, goal: f.goal === goal ? null : goal }));
  const clearAll = () => {
    setFilters(NO_FILTERS);
    onClearQuery();
  };

  const feedItems = feed.data?.items ?? [];
  const dealItems = realDeals(deals.data?.items);
  const resultItems = results.data?.items ?? [];

  return (
    <div className="space-y-8" data-discover-storefront="">
      {isGuest && (
        <div className="flex items-center gap-3 rounded-vcard border border-primary/30 bg-primary/5 p-4" data-discover-guest="">
          <div className="shrink-0 rounded-full bg-primary/15 p-2">
            <Gift className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('discover.guest.bannerTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('discover.guest.bannerSubtitle')}</p>
          </div>
          <Button size="sm" onClick={onSignIn} className="shrink-0">
            {t('discover.guest.bannerCta')}
          </Button>
        </div>
      )}

      <ChipBar ariaLabel={t('spotlightDiscover.storefront.filtersAria')}>
        <Chip active={!hasActiveFilters(filters)} onClick={() => setFilters(NO_FILTERS)}>
          {t('spotlightDiscover.storefront.chips.all')}
        </Chip>
        {GOAL_CHIPS.map((c) => (
          <Chip key={c.id} active={filters.goal === c.id} onClick={() => toggleGoal(c.id)}>
            {t(c.labelKey)}
          </Chip>
        ))}
        <Chip active={filters.underPrice} onClick={() => setFilters((f) => ({ ...f, underPrice: !f.underPrice }))}>
          {t('spotlightDiscover.storefront.chips.underPrice', { price: discoverPrice(PRICE_CHIP_MAX_CENTS, 'EUR') })}
        </Chip>
        <Chip active={filters.topRated} onClick={() => setFilters((f) => ({ ...f, topRated: !f.topRated }))}>
          {t('spotlightDiscover.storefront.chips.topRated', { rating: fmtNumber(RATING_CHIP_MIN) })}
        </Chip>
      </ChipBar>

      {resultsMode ? (
        <section aria-labelledby="discover-results-title" className="space-y-4" data-discover-results="">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="discover-results-title" className="text-lg font-bold">
              {t('spotlightDiscover.storefront.results.heading')}
            </h2>
            {results.data && (
              <span className="text-sm text-muted-foreground">
                {t('spotlightDiscover.storefront.results.count', { count: fmtNumber(results.data.total_count ?? resultItems.length) })}
              </span>
            )}
          </div>
          {results.isLoading ? (
            <>
              <VCardSkeleton size="spotlight" />
              <DiscoverGridSkeleton />
            </>
          ) : results.isError ? (
            <DiscoverError onRetry={() => results.refetch()} />
          ) : resultItems.length === 0 ? (
            <DiscoverEmpty
              titleKey="spotlightDiscover.storefront.empty.resultsTitle"
              descriptionKey="spotlightDiscover.storefront.empty.resultsDesc"
              actionKey="spotlightDiscover.storefront.empty.clearFilters"
              onAction={clearAll}
            />
          ) : (
            <>
              <ProductHero product={resultItems[0]} label={t('spotlightDiscover.storefront.hero.topResult')} onOpen={openProduct} />
              {resultItems.length > 1 && <ProductGrid products={resultItems.slice(1)} onOpen={openProduct} />}
            </>
          )}
          <HiddenByLimitationsFooter breakdown={results.data?.hidden_breakdown} />
        </section>
      ) : (
        <>
          {/* Hero — the one spotlight card (SR-06) */}
          <div data-discover-hero="">
            {feed.isLoading ? (
              <VCardSkeleton size="spotlight" />
            ) : feed.isError ? (
              <DiscoverError onRetry={() => feed.refetch()} />
            ) : feedItems.length === 0 ? (
              <DiscoverEmpty
                Icon={Sparkles}
                titleKey="spotlightDiscover.storefront.empty.feedTitle"
                descriptionKey="spotlightDiscover.storefront.empty.feedDesc"
              />
            ) : (
              <ProductHero product={feedItems[0]} label={t('spotlightDiscover.storefront.hero.pickedForYou')} onOpen={openProduct} />
            )}
          </div>

          {feedItems.length > 1 && (
            <DiscoverShelf id="picks" title={t('spotlightDiscover.storefront.shelves.picks')} seeAllHref="/discover/ai-picks">
              <ProductGrid products={feedItems.slice(1, 1 + SHELF_SIZE)} onOpen={openProduct} />
            </DiscoverShelf>
          )}

          <DiscoverShelf id="supplements" title={t('spotlightDiscover.storefront.shelves.supplements')} seeAllHref="/discover/supplements">
            {supplements.isLoading ? (
              <DiscoverGridSkeleton />
            ) : supplements.isError ? (
              <DiscoverError onRetry={() => supplements.refetch()} />
            ) : (supplements.data?.items ?? []).length === 0 ? (
              <DiscoverEmpty titleKey="spotlightDiscover.storefront.empty.shelfTitle" descriptionKey="spotlightDiscover.storefront.empty.shelfDesc" />
            ) : (
              <ProductGrid products={(supplements.data?.items ?? []).slice(0, SHELF_SIZE)} onOpen={openProduct} />
            )}
          </DiscoverShelf>

          <DiscoverShelf id="deals" title={t('spotlightDiscover.storefront.shelves.deals')} seeAllHref="/discover/deals-offers">
            {deals.isLoading ? (
              <DiscoverGridSkeleton />
            ) : deals.isError ? (
              <DiscoverError onRetry={() => deals.refetch()} />
            ) : dealItems.length === 0 ? (
              <DiscoverEmpty Icon={Tag} titleKey="spotlightDiscover.storefront.empty.dealsTitle" descriptionKey="spotlightDiscover.storefront.empty.dealsDesc" />
            ) : (
              <ProductGrid products={dealItems.slice(0, SHELF_SIZE)} onOpen={openProduct} />
            )}
          </DiscoverShelf>

          <div className="grid grid-cols-2 gap-4">
            <DiscoverShelf id="services" title={t('spotlightDiscover.storefront.shelves.services')} seeAllHref="/discover/wellness-services">
              <DiscoverEmpty
                Icon={Sparkles}
                titleKey="spotlightDiscover.storefront.empty.servicesTitle"
                descriptionKey="spotlightDiscover.storefront.empty.servicesDesc"
              />
            </DiscoverShelf>
            <DiscoverShelf id="coaches" title={t('spotlightDiscover.storefront.shelves.coaches')} seeAllHref="/discover/doctors-coaches">
              <DiscoverEmpty
                Icon={Stethoscope}
                titleKey="spotlightDiscover.storefront.empty.coachesTitle"
                descriptionKey="spotlightDiscover.storefront.empty.coachesDesc"
              />
            </DiscoverShelf>
          </div>

          <DiscoverShelf id="share" title={t('spotlightDiscover.storefront.shelves.shareEarn')}>
            {isGuest ? (
              <DiscoverEmpty
                Icon={Share2}
                titleKey="spotlightDiscover.storefront.empty.shareGuestTitle"
                descriptionKey="spotlightDiscover.storefront.empty.shareGuestDesc"
                actionKey="spotlightDiscover.storefront.empty.signIn"
                onAction={onSignIn}
              />
            ) : myRecs.isLoading ? (
              <DiscoverGridSkeleton />
            ) : myRecs.isError ? (
              <DiscoverError onRetry={() => myRecs.refetch()} />
            ) : (myRecs.data?.items ?? []).length === 0 ? (
              <DiscoverEmpty Icon={Share2} titleKey="spotlightDiscover.storefront.empty.shareTitle" descriptionKey="spotlightDiscover.storefront.empty.shareDesc" />
            ) : (
              <ul className={DISCOVER_GRID}>
                {(myRecs.data?.items ?? []).slice(0, SHELF_SIZE).map((rec) => {
                  const card = recommendationToVCard(rec);
                  return (
                    <DataVCard
                      key={card.key}
                      data={{
                        ...card,
                        meta: t('spotlightDiscover.storefront.share.meta', { clicks: fmtNumber(card.clicks), earned: card.earned }),
                      }}
                      onOpen={card.href ? () => navigate(card.href as string) : undefined}
                    />
                  );
                })}
              </ul>
            )}
          </DiscoverShelf>

          <div>
            <HiddenByLimitationsFooter breakdown={feed.data?.hidden_breakdown} />
            <AffiliateDisclosure className="mt-3" />
          </div>
        </>
      )}

      <DiscoverQuickViewSheet item={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
