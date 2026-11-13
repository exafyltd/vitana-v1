/**
 * VTID-05677 — the Unified Card strip of the Media Hub (web
 * `<EnrichmentCardStrip screen="community" layout="carousel" />`,
 * `MediaHub.tsx:875`): the server enrichment cards the `community` screen places
 * (at most three, in priority order), as a horizontal carousel when there are
 * several. Renders nothing while loading, on error or when none is left
 * (`EnrichmentCardStrip.tsx:93-96`). The static feature cards (F5 / F7 / F10)
 * have no native twin yet and are not shown. Reads `useEnrichmentCards` and
 * `EnrichmentCard` from the Home port, edits nothing under `screens/home`.
 */
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { CARD_SCREENS, isServerCardPlaced, isVitanaCardType } from '../../ports/feed';
import { EnrichmentCard } from '../home/cards/EnrichmentCard';
import { useEnrichmentCards } from '../home/data/enrichment';

const MAX_CARDS = 3;

export function EnrichmentStrip() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const config = CARD_SCREENS.community;
  const { cards, isLoading, isError, dismiss } = useEnrichmentCards(config.server);
  if (isLoading || isError) return null;
  const entries = cards.filter((c) => isVitanaCardType(c.card_type) && isServerCardPlaced(config, c.card_type)).slice(0, MAX_CARDS);
  if (entries.length === 0) return null;
  const nodes = entries.map((card) => <EnrichmentCard key={card.card_type} card={card} onDismiss={dismiss} />);
  if (nodes.length === 1) {
    return (
      <View style={styles.single} accessibilityLabel={t('screens.vitanaCards.stripLabel')} testID="media-enrichment-strip">
        {nodes}
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={t('screens.vitanaCards.stripLabel')} testID="media-enrichment-strip">
      {nodes.map((node, i) => (
        <View key={entries[i].card_type} style={{ width: Math.round(width * 0.88) }}>
          {node}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  single: { paddingHorizontal: 16 },
  row: { gap: 12, paddingHorizontal: 16 },
});
