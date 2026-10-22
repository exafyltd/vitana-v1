/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the Unified Card System card as
 * it appears in Home's feed: a token-styled twin of the web
 * `VitanaRecommendationCard` shell. The server owns the enrichment/boost state
 * (`useEnrichmentCards`); this card owns presentation. Cards are told apart by
 * a start-edge accent bar derived from the card's category (`cardCategory`
 * through the feed port) — the web's per-card Tailwind accent palette is a
 * web-token class map that does not cross the native bridge, so the native
 * card keeps the one distinction that reads on a phone: enrichment / feature /
 * boost. Title, description, an optional deep-link CTA, and the X dismiss the
 * web card shows. React 19: typed with `ReactElement`.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { cardCategory, CARD_DEEP_LINKS, type CardCategory, type VitanaCardType } from '../../../ports/feed';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useI18n } from '../../../i18n/I18nProvider';
import type { EnrichmentCard as EnrichmentCardData } from '../data/enrichment';

/** One accent per category, from the kit theme (tokens only). */
function accentFor(category: CardCategory, colors: ReturnType<typeof useUITheme>['colors']): string {
  if (category === 'boost') return colors.destructive;
  if (category === 'feature') return colors.accent;
  return colors.primary;
}

export function EnrichmentCard({ card, onDismiss }: { card: EnrichmentCardData; onDismiss: (type: VitanaCardType) => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const category = cardCategory(card.card_type);
  const accent = accentFor(category, colors);
  const deepLink = CARD_DEEP_LINKS[card.card_type];

  return (
    <View
      testID={`feed-card-${card.card_type}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text weight="700" numberOfLines={2} style={styles.title}>
            {card.title}
          </Text>
          <IconButton
            name="X"
            size={16}
            onPress={() => onDismiss(card.card_type)}
            accessibilityLabel={t('homeNative.card.dismiss')}
            testID={`feed-card-${card.card_type}-dismiss`}
          />
        </View>
        {card.description ? (
          <Text variant="body" muted numberOfLines={3} style={styles.description}>
            {card.description}
          </Text>
        ) : null}
        {deepLink ? (
          <View style={styles.actions}>
            <Button size="sm" onPress={() => navigateToWebPath(deepLink)} testID={`feed-card-${card.card_type}-cta`}>
              {t('homeNative.card.open')}
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 16, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1 },
  description: { lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
});
