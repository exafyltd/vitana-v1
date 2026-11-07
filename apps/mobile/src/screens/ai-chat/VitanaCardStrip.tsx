/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — native twin of the web
 * `EnrichmentCardStrip` (`src/components/vitana/EnrichmentCardStrip.tsx`,
 * VTID-05085) as Talk to Vitana mounts it (`screen="talk-to-vitana"`, stacked,
 * at most 3 cards):
 *
 * - server cards first: `GET /api/v1/enrichment-cards?screen=talk-to-vitana`
 *   (the home lane's native hook), already ordered and localized, kept when
 *   `isServerCardPlaced` allows them on this screen; X = server dismiss;
 * - then the screen's static feature cards (F1, F2, F3) not hidden on this
 *   device; X = the 7-day local hide;
 * - capped at `maxCards`. Nothing while the server cards load, nothing when
 *   the list is empty; a failed request drops only the server cards.
 *
 * Server cards render through the home lane's `EnrichmentCard` (title,
 * description, deep-link CTA, X), as Home's feed does.
 */
import { useMemo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { CARD_SCREENS, isServerCardPlaced, type CardScreen, type VitanaCardType } from '../../ports/feed';
import { EnrichmentCard, useEnrichmentCards, type EnrichmentCardData } from '../../ports/ai-chat';
import { useI18n } from '../../i18n/I18nProvider';
import { FEATURE_CARDS } from './cards/FeatureCards';
import { useDismissedFeatureCards } from './data/feature-dismiss';

type Entry = { type: VitanaCardType; server: EnrichmentCardData | null };

export function VitanaCardStrip({ screen, maxCards = 3 }: { screen: CardScreen; maxCards?: number }): ReactElement | null {
  const { t } = useI18n();
  const config = CARD_SCREENS[screen];
  const { cards, isLoading, dismiss } = useEnrichmentCards(config.server);
  const features = useMemo(() => config.features.filter((tp) => !!FEATURE_CARDS[tp]) as VitanaCardType[], [config]);
  const local = useDismissedFeatureCards(features);

  const entries = useMemo<Entry[]>(() => {
    const server = cards.filter((c) => isServerCardPlaced(config, c.card_type)).map((c) => ({ type: c.card_type, server: c }));
    const shown = features.filter((tp) => !local.dismissed.has(tp)).map((tp) => ({ type: tp, server: null }));
    return [...server, ...shown].slice(0, Math.max(0, maxCards));
  }, [cards, config, features, local.dismissed, maxCards]);

  if ((config.server && isLoading) || !local.ready) return null;
  if (entries.length === 0) return null;

  return (
    <View testID={`vitana-card-strip-${screen}`} accessibilityLabel={t('screens.vitanaCards.stripLabel')} style={styles.strip}>
      {entries.map((entry) => {
        const Card = FEATURE_CARDS[entry.type];
        if (entry.server) {
          const card = entry.server;
          // A feature card the server sends keeps its own face, with the server's copy (web registry).
          return Card ? (
            <Card key={`s-${card.card_type}`} title={card.title} description={card.description} onDismiss={() => dismiss(card.card_type)} />
          ) : (
            <EnrichmentCard key={`s-${card.card_type}`} card={card} onDismiss={dismiss} />
          );
        }
        return Card ? <Card key={`f-${entry.type}`} onDismiss={() => local.dismiss(entry.type)} /> : null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 8 },
});
