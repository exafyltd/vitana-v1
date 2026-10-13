import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, Stethoscope, Tag, TrendingUp } from 'lucide-react';
import { SplitBarContent } from '@/components/ui/split-bar';
import { VCardSkeleton } from '@/components/ui/vcard';
import {
  bookmarkToProvider,
  bookmarkToService,
  providerToVCard,
  serviceToVCard,
  type VCardData,
} from '@/components/ui/vcard/adapters';
import { HiddenByLimitationsFooter } from '@/components/discover/HiddenByLimitationsFooter';
import { AffiliateDisclosure } from '@/components/discover/AffiliateDisclosure';
import { useMarketplaceFeed, useMarketplaceSearch, type MarketplaceProduct } from '@/hooks/useMarketplace';
import type { BookmarkedItem } from '@/types/bookmarks';
import { t } from '@/lib/i18n-toast';
import { ProductGrid, ProductHero } from './DiscoverCards';
import { Chip, ChipBar } from './DiscoverChips';
import { DiscoverEmpty, DiscoverError, DiscoverGridSkeleton } from './DiscoverStates';
import { DiscoverQuickViewSheet, type QuickViewItem } from './DiscoverQuickViewSheet';
import { SavedItemsGrid } from './SavedItemsGrid';
import { useDebouncedValue } from './useDebouncedValue';
import {
  DEALS_SEARCH,
  SUPPLEMENT_SORTS,
  SUPPLEMENT_SUBCATEGORIES,
  realDeals,
  type SupplementSort,
} from './storefront-model';

/**
 * VTID-05109 — the Spotlight content of the Discover sub-pages (task 3.4).
 * Each component renders the `SplitBarContent` panes for the tabs its page
 * passes to `ScreenFrame` (the tabs sit at the end of the utility row). All
 * lists are `standard` VCard grids with loading, empty and error states;
 * sections whose catalog is still sample data show an empty state plus the
 * member's own saved items instead of sample items (SR-24).
 */

function useQuickView() {
  const [item, setItem] = useState<QuickViewItem | null>(null);
  const openProduct = useCallback((product: MarketplaceProduct) => setItem({ kind: 'product', product }), []);
  const sheet = <DiscoverQuickViewSheet item={item} onClose={() => setItem(null)} />;
  return { setItem, openProduct, sheet };
}

const savedSupplementToCard = (b: BookmarkedItem): VCardData => ({
  key: b.id,
  media: { src: b.item_image_url ?? null, alt: b.item_name },
  eyebrow: typeof b.item_metadata?.brand === 'string' ? b.item_metadata.brand : undefined,
  title: b.item_name,
  href: `/discover/product/${b.item_id}`,
});

// ------------------------------------------------------------ Supplements ---

export function SupplementsPanes({ query, initialSubcategory }: { query: string; initialSubcategory?: string | null }) {
  const navigate = useNavigate();
  const { openProduct, sheet } = useQuickView();
  const [sub, setSub] = useState(initialSubcategory ?? 'all');
  const [sort, setSort] = useState<SupplementSort>('relevance');
  const q = useDebouncedValue(query);
  const search = useMarketplaceSearch({
    category: 'supplements',
    q: q.trim() || undefined,
    subcategory: sub !== 'all' ? sub : undefined,
    sort,
    limit: 48,
  });
  const picks = useMarketplaceFeed({ category: 'supplements', limit: 12 });
  const items = search.data?.items ?? [];
  const pickItems = picks.data?.items ?? [];

  return (
    <>
      <SplitBarContent value="browse" className="space-y-4">
        <ChipBar ariaLabel={t('spotlightDiscover.supplements.categoriesAria')}>
          {SUPPLEMENT_SUBCATEGORIES.map((c) => (
            <Chip key={c.value} active={sub === c.value} onClick={() => setSub(c.value)}>
              {t(c.labelKey)}
            </Chip>
          ))}
        </ChipBar>
        <ChipBar ariaLabel={t('spotlightDiscover.supplements.sortAria')}>
          {SUPPLEMENT_SORTS.map((s) => (
            <Chip key={s.value} active={sort === s.value} onClick={() => setSort(s.value)}>
              {t(s.labelKey)}
            </Chip>
          ))}
        </ChipBar>
        {search.isLoading ? (
          <DiscoverGridSkeleton count={8} />
        ) : search.isError ? (
          <DiscoverError onRetry={() => search.refetch()} />
        ) : items.length === 0 ? (
          <DiscoverEmpty titleKey="spotlightDiscover.storefront.empty.resultsTitle" descriptionKey="spotlightDiscover.storefront.empty.resultsDesc" />
        ) : (
          <ProductGrid products={items} onOpen={openProduct} />
        )}
        <HiddenByLimitationsFooter breakdown={search.data?.hidden_breakdown} />
        <AffiliateDisclosure className="mt-3" />
      </SplitBarContent>

      <SplitBarContent value="picks" className="space-y-4">
        <h2 className="text-lg font-bold">{t('spotlightDiscover.supplements.picksTitle')}</h2>
        {picks.isLoading ? (
          <DiscoverGridSkeleton />
        ) : picks.isError ? (
          <DiscoverError onRetry={() => picks.refetch()} />
        ) : pickItems.length === 0 ? (
          <DiscoverEmpty Icon={Sparkles} titleKey="spotlightDiscover.storefront.empty.feedTitle" descriptionKey="spotlightDiscover.storefront.empty.feedDesc" />
        ) : (
          <ProductGrid products={pickItems} onOpen={openProduct} />
        )}
      </SplitBarContent>

      <SplitBarContent value="stack" className="space-y-4">
        <SavedItemsGrid
          type="supplement"
          toCard={savedSupplementToCard}
          query={query}
          onOpen={(card) => card.href && navigate(card.href)}
          Icon={Heart}
          emptyTitleKey="screens.discover.noSavedSupplementsYet"
          emptyDescriptionKey="screens.discover.saveYourFavoriteSupplementsTrackYour"
        />
      </SplitBarContent>
      {sheet}
    </>
  );
}

// ------------------------------------------------------ Wellness services ---

export function WellnessServicesPanes({ query }: { query: string }) {
  const { setItem, sheet } = useQuickView();
  const comingSoon = (
    <DiscoverEmpty
      Icon={Sparkles}
      titleKey="spotlightDiscover.storefront.empty.servicesTitle"
      descriptionKey="spotlightDiscover.storefront.empty.servicesDesc"
    />
  );
  return (
    <>
      <SplitBarContent value="categories">{comingSoon}</SplitBarContent>
      <SplitBarContent value="recommended">{comingSoon}</SplitBarContent>
      <SplitBarContent value="bookmarked">
        <SavedItemsGrid
          type="wellness_service"
          toCard={(b) => serviceToVCard(bookmarkToService(b))}
          query={query}
          onOpen={(card) => setItem({ kind: 'service', card })}
          Icon={Heart}
          emptyTitleKey="spotlightDiscover.saved.servicesTitle"
          emptyDescriptionKey="spotlightDiscover.saved.servicesDesc"
        />
      </SplitBarContent>
      {sheet}
    </>
  );
}

// -------------------------------------------------------- Doctors/Coaches ---

export function DoctorsCoachesPanes({ query }: { query: string }) {
  const { setItem, sheet } = useQuickView();
  const comingSoon = (
    <DiscoverEmpty
      Icon={Stethoscope}
      titleKey="spotlightDiscover.storefront.empty.coachesTitle"
      descriptionKey="spotlightDiscover.storefront.empty.coachesDesc"
    />
  );
  return (
    <>
      <SplitBarContent value="find">{comingSoon}</SplitBarContent>
      <SplitBarContent value="matches">{comingSoon}</SplitBarContent>
      <SplitBarContent value="myproviders">
        <SavedItemsGrid
          type="provider"
          toCard={(b) => providerToVCard(bookmarkToProvider(b))}
          query={query}
          onOpen={(card) => setItem({ kind: 'provider', card })}
          Icon={Stethoscope}
          emptyTitleKey="spotlightDiscover.saved.providersTitle"
          emptyDescriptionKey="spotlightDiscover.saved.providersDesc"
        />
      </SplitBarContent>
      {sheet}
    </>
  );
}

// ---------------------------------------------------------- Deals & Offers ---

export function DealsPanes({ query }: { query: string }) {
  const { setItem, openProduct, sheet } = useQuickView();
  const q = useDebouncedValue(query).trim().toLowerCase();
  const deals = useMarketplaceSearch(DEALS_SEARCH);
  const feed = useMarketplaceFeed({ limit: 12 });
  const dealItems = realDeals(deals.data?.items).filter((p) => !q || p.title.toLowerCase().includes(q));
  const feedItems = feed.data?.items ?? [];

  return (
    <>
      <SplitBarContent value="flash" className="space-y-6">
        {deals.isLoading ? (
          <>
            <VCardSkeleton size="spotlight" />
            <DiscoverGridSkeleton />
          </>
        ) : deals.isError ? (
          <DiscoverError onRetry={() => deals.refetch()} />
        ) : dealItems.length === 0 ? (
          <DiscoverEmpty Icon={Tag} titleKey="spotlightDiscover.storefront.empty.dealsTitle" descriptionKey="spotlightDiscover.storefront.empty.dealsDesc" />
        ) : (
          <>
            <ProductHero product={dealItems[0]} label={t('screens.discover.flashDeals')} onOpen={openProduct} />
            {dealItems.length > 1 && <ProductGrid products={dealItems.slice(1)} onOpen={openProduct} />}
          </>
        )}
        <AffiliateDisclosure className="mt-3" />
      </SplitBarContent>

      <SplitBarContent value="trending">
        <DiscoverEmpty Icon={TrendingUp} titleKey="spotlightDiscover.deals.trendingTitle" descriptionKey="spotlightDiscover.deals.trendingDesc" />
      </SplitBarContent>

      <SplitBarContent value="ai" className="space-y-4">
        {feed.isLoading ? (
          <DiscoverGridSkeleton />
        ) : feed.isError ? (
          <DiscoverError onRetry={() => feed.refetch()} />
        ) : feedItems.length === 0 ? (
          <DiscoverEmpty Icon={Sparkles} titleKey="spotlightDiscover.storefront.empty.feedTitle" descriptionKey="spotlightDiscover.storefront.empty.feedDesc" />
        ) : (
          <ProductGrid products={feedItems} onOpen={openProduct} />
        )}
      </SplitBarContent>

      <SplitBarContent value="saved">
        <SavedItemsGrid
          type="deal"
          toCard={(b) => ({ ...serviceToVCard(bookmarkToService(b)), href: undefined })}
          query={query}
          onOpen={(card) => setItem({ kind: 'service', card })}
          Icon={Heart}
          emptyTitleKey="spotlightDiscover.saved.dealsTitle"
          emptyDescriptionKey="spotlightDiscover.saved.dealsDesc"
        />
      </SplitBarContent>
      {sheet}
    </>
  );
}
