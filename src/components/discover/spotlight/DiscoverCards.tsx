import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { VCard } from '@/components/ui/vcard';
import {
  discountPercent,
  storefrontProductToVCard,
  type VCardData,
} from '@/components/ui/vcard/adapters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import { DISCOVER_GRID } from './storefront-model';

/**
 * VTID-05109 — the Discover VCards. Every product, service, provider and
 * recommendation on the Spotlight Discover screens renders through VCard
 * (SR-09): `spotlight` for the one hero, `standard` for shelves and grids.
 * The title is a real button so the keyboard path reaches the quick view
 * (SR-29); a click anywhere on the card does the same.
 */

function cartItem(p: MarketplaceProduct) {
  return {
    item_type: 'product' as const,
    item_id: p.id,
    item_name: p.title,
    item_price: p.price_cents ? p.price_cents / 100 : 0,
    item_image_url: p.images?.[0],
    item_metadata: { brand: p.brand, category: p.category },
  };
}

function TitleButton({ children, onOpen }: { children: React.ReactNode; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="text-start hover:text-primary focus-visible:underline focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function DiscountBadge({ product }: { product: MarketplaceProduct }) {
  const pct = discountPercent(product);
  if (pct == null || pct <= 0) return null;
  return <Badge variant="destructive">{t('spotlightDiscover.card.discount', { percent: pct })}</Badge>;
}

/** A product as a `standard` card in a shelf or results grid. */
export function ProductVCard({ product, onOpen }: { product: MarketplaceProduct; onOpen: (p: MarketplaceProduct) => void }) {
  const d = storefrontProductToVCard(product);
  return (
    <VCard
      as="li"
      size="standard"
      media={d.media}
      eyebrow={d.eyebrow}
      title={<TitleButton onOpen={() => onOpen(product)}>{d.title}</TitleButton>}
      meta={d.meta}
      badge={<DiscountBadge product={product} />}
      data-product-id={product.id}
      className="cursor-pointer transition-shadow hover:shadow-vcard-raised"
      onClick={() => onOpen(product)}
    />
  );
}

/** The one `spotlight` card of a storefront (SR-06): image at the inline start, story and actions beside it. */
export function ProductHero({
  product,
  label,
  onOpen,
}: {
  product: MarketplaceProduct;
  label: string;
  onOpen: (p: MarketplaceProduct) => void;
}) {
  const d = storefrontProductToVCard(product);
  return (
    <VCard
      size="spotlight"
      priority
      media={d.media ? { ...d.media, ratio: 'landscape' } : { src: null, ratio: 'landscape' }}
      badge={<Badge variant="secondary">{label}</Badge>}
      eyebrow={d.eyebrow}
      title={<TitleButton onOpen={() => onOpen(product)}>{d.title}</TitleButton>}
      meta={d.meta}
      body={d.body ? <span className="line-clamp-3">{d.body}</span> : undefined}
      actions={
        <>
          <AddToCartButton item={cartItem(product)} size="sm" />
          <Button variant="outline" size="sm" onClick={() => onOpen(product)}>
            {t('spotlightDiscover.card.quickView')}
          </Button>
          {d.href && (
            <Button asChild variant="ghost" size="sm">
              <Link to={d.href}>
                {t('spotlightDiscover.card.openFullPage')}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
          )}
        </>
      }
      data-storefront-hero=""
      data-product-id={product.id}
      className="grid grid-cols-2 items-center"
    />
  );
}

/** A non-product item (service, provider, recommendation) as a `standard` card. */
export function DataVCard({
  data,
  onOpen,
  footer,
}: {
  data: VCardData;
  onOpen?: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <VCard
      as="li"
      size="standard"
      media={data.media ?? { src: null }}
      eyebrow={data.eyebrow}
      title={onOpen ? <TitleButton onOpen={onOpen}>{data.title}</TitleButton> : data.title}
      meta={data.meta}
      actions={footer}
      className={cn(onOpen && 'cursor-pointer transition-shadow hover:shadow-vcard-raised')}
      onClick={onOpen}
    />
  );
}

/** A grid of product cards: only `standard`, never mixed sizes in a row (SR-11). */
export function ProductGrid({
  products,
  onOpen,
  className,
}: {
  products: MarketplaceProduct[];
  onOpen: (p: MarketplaceProduct) => void;
  className?: string;
}) {
  return (
    <ul className={cn(DISCOVER_GRID, className)} data-discover-grid="">
      {products.map((p) => (
        <ProductVCard key={p.id} product={p} onOpen={onOpen} />
      ))}
    </ul>
  );
}

/** A storefront shelf: title, "See all" to the existing sub-route, then its content. */
export function DiscoverShelf({
  id,
  title,
  seeAllHref,
  children,
}: {
  id: string;
  title: string;
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  const headingId = `discover-shelf-${id}`;
  return (
    <section aria-labelledby={headingId} data-discover-shelf={id} className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="text-lg font-bold">
          {title}
        </h2>
        {seeAllHref && (
          <Link to={seeAllHref} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {t('spotlightDiscover.card.seeAll')}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
