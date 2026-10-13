import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ProductDetailsBody } from '@/components/discover/ProductDetailsDrawer';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';
import type { VCardData } from '@/components/ui/vcard/adapters';
import { t } from '@/lib/i18n-toast';
import { inlineEndSide } from './storefront-model';

/**
 * VTID-05109 — one quick-view sheet for products, services and providers
 * (requirement R5.3), generalised from `ProductDetailsDrawer`. It opens from
 * the inline-end side (away from the ORB at the sidebar's bottom centre) and
 * always offers "Open full page" → the item's existing detail route.
 * Products reuse the drawer's own body, so price, match reasons, cart,
 * Recommend and Share behave exactly as in the legacy drawer.
 */
export type QuickViewItem =
  | { kind: 'product'; product: MarketplaceProduct }
  | { kind: 'service' | 'provider'; card: VCardData };

function quickViewTitle(item: QuickViewItem): string {
  return item.kind === 'product' ? item.product.title : item.card.title;
}

export function DiscoverQuickViewSheet({ item, onClose }: { item: QuickViewItem | null; onClose: () => void }) {
  return (
    <Sheet open={!!item} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side={inlineEndSide()} className="w-full overflow-y-auto p-0 sm:max-w-xl" data-discover-quick-view="">
        <SheetHeader className="sr-only">
          <SheetTitle>{item ? quickViewTitle(item) : t('spotlightDiscover.quickView.title')}</SheetTitle>
          <SheetDescription>{t('spotlightDiscover.quickView.title')}</SheetDescription>
        </SheetHeader>
        {item?.kind === 'product' && <ProductDetailsBody product={item.product} onClose={onClose} />}
        {item && item.kind !== 'product' && <CardDetailsBody card={item.card} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function CardDetailsBody({ card, onClose }: { card: VCardData; onClose: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {card.media?.src ? <img src={card.media.src} alt={card.media.alt ?? ''} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="space-y-3 p-5">
        {card.eyebrow && <div className="text-xs font-bold uppercase tracking-wide text-primary">{card.eyebrow}</div>}
        <h2 className="text-xl font-semibold leading-tight">{card.title}</h2>
        {card.meta && <p className="text-sm text-muted-foreground">{card.meta}</p>}
        <p className="text-sm leading-relaxed text-muted-foreground">{card.body ?? t('spotlightDiscover.quickView.noDetails')}</p>
        {card.href && (
          <Button asChild variant="outline" size="sm">
            <Link to={card.href} onClick={onClose}>
              {t('spotlightDiscover.card.openFullPage')}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
