/**
 * VTID-05461 — My Journey's Unified Card System strip
 * (`<EnrichmentCardStrip screen="autopilot" />`, AutopilotDashboard.tsx:428;
 * strip logic `src/components/vitana/EnrichmentCardStrip.tsx:71-127`): the
 * gateway's enrichment / boost cards for the `autopilot` screen, filtered by
 * the catalog's placement rule (`isServerCardPlaced(CARD_SCREENS.autopilot)`,
 * boost G3 only), at most 3, stacked; nothing while loading or when empty.
 * Reuses the home lane's native card and enrichment hook (read-only imports).
 *
 * Deferred, recorded: the strip's static feature cards (F1/F2/F3/F9,
 * EnrichmentCardStrip.tsx:85-87) are web components with their own copy and
 * device-local dismissal; the home lane carries no native twin of them either.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { CARD_SCREENS, isServerCardPlaced } from '../../ports/feed';
import { useEnrichmentCards } from '../home/data/enrichment';
import { EnrichmentCard } from '../home/cards/EnrichmentCard';
import { useI18n } from '../../i18n/I18nProvider';

const MAX_CARDS = 3;

export function EnrichmentStrip(): ReactElement | null {
  const { t } = useI18n();
  const config = CARD_SCREENS.autopilot;
  const { cards, isLoading, dismiss } = useEnrichmentCards(config.server ?? null);
  if (config.server && isLoading) return null;
  const entries = cards.filter((c) => isServerCardPlaced(config, c.card_type)).slice(0, MAX_CARDS);
  if (entries.length === 0) return null;
  return (
    <View style={styles.strip} accessibilityLabel={t('screens.vitanaCards.stripLabel')} testID="vitana-card-strip-autopilot">
      {entries.map((c) => (
        <EnrichmentCard key={c.card_type} card={c} onDismiss={dismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ strip: { gap: 8 } });
