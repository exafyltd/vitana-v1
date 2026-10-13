/**
 * VTID-05085 — the Unified Card System strip a screen mounts.
 *
 * Server cards (enrichment/boost, already in priority order, already
 * localized) come first, then the screen's static feature cards that the
 * member has not hidden on this device. Capped at `maxCards`. Boost cards
 * (G1–G3) show only on the screens plan §4 places them (`CARD_SCREENS.boost`)
 * and get their number through `params`.
 *
 * Never an empty box: while loading, when nothing is left, or when the
 * gateway fails, it renders nothing (a failed request drops only the server
 * cards; the static feature cards do not depend on it).
 */
import { useMemo, useState, type ReactElement } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';
import { useEnrichmentCards } from '@/hooks/useEnrichmentCards';
import { isFeatureCardDismissed, rememberFeatureCardDismissed } from '@/hooks/useCardDismiss';
import { getVitanaCardComponent } from '@/components/vitana/card-registry';
import {
  CARD_SCREENS,
  cardCategory,
  isServerCardPlaced,
  type CardScreen,
  type VitanaCardType,
} from '@/components/vitana/vitana-card-catalog';

export interface EnrichmentCardStripProps {
  screen: CardScreen;
  maxCards?: number;
  layout?: 'carousel' | 'stacked';
  /**
   * Render only the enrichment cards (`server`) or only the boost + static
   * feature cards (`features`) — Profile shows its enrichment carousel with
   * the feature/boost cards stacked below it (plan §4). Both halves share
   * one cached request.
   */
  only?: 'server' | 'features';
  className?: string;
}

interface StripEntry {
  cardType: VitanaCardType;
  title?: string;
  description?: string;
  params?: Record<string, number>;
  server: boolean;
}

function readDirection(): 'ltr' | 'rtl' {
  if (typeof document === 'undefined') return 'ltr';
  return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
}

function Carousel({ children }: { children: ReactElement[] }) {
  const [ref] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps', direction: readDirection() });
  return (
    <div ref={ref} className="overflow-hidden" data-testid="vitana-card-carousel">
      <div className="flex gap-3">
        {children.map((child) => (
          <div key={child.key} className="min-w-0 shrink-0 grow-0 basis-11/12 sm:basis-1/2">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnrichmentCardStrip({ screen, maxCards = 3, layout = 'stacked', only, className }: EnrichmentCardStripProps) {
  const config = CARD_SCREENS[screen];
  const { cards, isLoading, dismiss } = useEnrichmentCards(config.server);
  // Bumped when a feature card is hidden, so the local TTL is re-read.
  const [localVersion, setLocalVersion] = useState(0);

  const entries = useMemo<StripEntry[]>(() => {
    // `server` half: enrichment only; `features` half: boost + feature cards.
    const inHalf = (type: VitanaCardType) =>
      !only || (only === 'server' ? cardCategory(type) !== 'boost' : cardCategory(type) === 'boost');
    const server = cards
      .filter((c) => inHalf(c.card_type) && isServerCardPlaced(config, c.card_type))
      .filter((c) => getVitanaCardComponent(c.card_type))
      .map((c) => ({ cardType: c.card_type, title: c.title, description: c.description, params: c.params, server: true }));
    const features = (only === 'server' ? [] : config.features)
      .filter((type) => getVitanaCardComponent(type) && !isFeatureCardDismissed(type))
      .map((type) => ({ cardType: type as VitanaCardType, server: false }));
    return [...server, ...features].slice(0, Math.max(0, maxCards));
    // localVersion: re-read localStorage after a feature card is hidden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, config, maxCards, only, localVersion]);

  // The feature half waits only when it can hold boost cards (no jump when they arrive).
  const waitsForServer = only !== 'features' || (config.boost?.length ?? 0) > 0;
  if (config.server && isLoading && waitsForServer) return null;
  if (entries.length === 0) return null;

  const nodes = entries.map((entry) => {
    const Card = getVitanaCardComponent(entry.cardType)!;
    const onDismiss = entry.server
      ? () => dismiss(entry.cardType)
      : () => {
          rememberFeatureCardDismissed(entry.cardType);
          setLocalVersion((v) => v + 1);
        };
    return (
      <Card key={entry.cardType} title={entry.title} description={entry.description} params={entry.params} onDismiss={onDismiss} />
    );
  });

  return (
    <section
      aria-label={t('screens.vitanaCards.stripLabel')}
      data-testid={`vitana-card-strip-${screen}${only ? `-${only}` : ''}`}
      data-layout={layout}
      className={cn('w-full', className)}
    >
      {layout === 'carousel' && nodes.length > 1 ? <Carousel>{nodes}</Carousel> : <div className="flex flex-col gap-2">{nodes}</div>}
    </section>
  );
}
