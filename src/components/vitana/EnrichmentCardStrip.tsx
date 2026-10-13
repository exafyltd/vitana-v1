/**
 * VTID-05085 — the Unified Card System strip a screen mounts.
 *
 * Server cards (enrichment/boost, already in priority order, already
 * localized) come first, then the screen's static feature cards that the
 * member has not hidden on this device. Capped at `maxCards`.
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
import { CARD_SCREENS, type CardScreen, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';

export interface EnrichmentCardStripProps {
  screen: CardScreen;
  maxCards?: number;
  layout?: 'carousel' | 'stacked';
  className?: string;
}

interface StripEntry {
  cardType: VitanaCardType;
  title?: string;
  description?: string;
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

export function EnrichmentCardStrip({ screen, maxCards = 3, layout = 'stacked', className }: EnrichmentCardStripProps) {
  const config = CARD_SCREENS[screen];
  const { cards, isLoading, dismiss } = useEnrichmentCards(config.server);
  // Bumped when a feature card is hidden, so the local TTL is re-read.
  const [localVersion, setLocalVersion] = useState(0);

  const entries = useMemo<StripEntry[]>(() => {
    const server = cards
      .filter((c) => !config.allow || config.allow.includes(c.card_type))
      .filter((c) => getVitanaCardComponent(c.card_type))
      .map((c) => ({ cardType: c.card_type, title: c.title, description: c.description, server: true }));
    const features = config.features
      .filter((type) => getVitanaCardComponent(type) && !isFeatureCardDismissed(type))
      .map((type) => ({ cardType: type as VitanaCardType, server: false }));
    return [...server, ...features].slice(0, Math.max(0, maxCards));
    // localVersion: re-read localStorage after a feature card is hidden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, config, maxCards, localVersion]);

  if (config.server && isLoading) return null;
  if (entries.length === 0) return null;

  const nodes = entries.map((entry) => {
    const Card = getVitanaCardComponent(entry.cardType)!;
    const onDismiss = entry.server
      ? () => dismiss(entry.cardType)
      : () => {
          rememberFeatureCardDismissed(entry.cardType);
          setLocalVersion((v) => v + 1);
        };
    return <Card key={entry.cardType} title={entry.title} description={entry.description} onDismiss={onDismiss} />;
  });

  return (
    <section
      aria-label={t('screens.vitanaCards.stripLabel')}
      data-testid={`vitana-card-strip-${screen}`}
      data-layout={layout}
      className={cn('w-full', className)}
    >
      {layout === 'carousel' && nodes.length > 1 ? <Carousel>{nodes}</Carousel> : <div className="flex flex-col gap-2">{nodes}</div>}
    </section>
  );
}
