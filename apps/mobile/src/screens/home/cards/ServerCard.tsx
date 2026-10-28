/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the two system-authored feed
 * items that are not member content: the product-discovery announcement
 * (`feature_announcement`, web `FeatureAnnouncementCard`) and the community
 * spotlight (`performer`, the "top performer" slot of the web
 * `NewsFeedItemCard`). Both are token-styled, with an accent bar and a CTA
 * that deep-links where the web card points (the announcement's `deep_link`;
 * the performer's public profile). React 19: typed with `ReactElement`.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useI18n } from '../../../i18n/I18nProvider';
import type { FeatureAnnouncementFeedItem, PerformerFeedItem } from '../../../ports/feed';

function initialOf(name: string): string {
  return (name || '•').trim().charAt(0).toUpperCase();
}

export function FeatureAnnouncementCard({ item }: { item: FeatureAnnouncementFeedItem }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const isNew = item.variant === 'brand-new-feature';
  return (
    <View
      testID={`feed-feature-${item.id}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
      <View style={styles.body}>
        <Text variant="label" style={{ color: colors.primary }} numberOfLines={1}>
          {t(isNew ? 'homeNative.feature.brandNew' : 'homeNative.feature.didYouKnow')}
        </Text>
        <Text weight="700" numberOfLines={2} style={styles.title}>
          {item.feature_title}
        </Text>
        {item.description ? (
          <Text variant="body" muted numberOfLines={3} style={styles.description}>
            {item.description}
          </Text>
        ) : null}
        {item.deep_link ? (
          <View style={styles.actions}>
            <Button size="sm" onPress={() => navigateToWebPath(item.deep_link)} testID={`feed-feature-${item.id}-cta`}>
              {t('homeNative.feature.tryIt')}
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function PerformerCard({ item }: { item: PerformerFeedItem }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  return (
    <View
      testID={`feed-performer-${item.id}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
      <View style={styles.body}>
        <Text variant="label" style={{ color: colors.primary }} numberOfLines={1}>
          {t('homeNative.performer.badge')}
        </Text>
        <View style={styles.performerRow}>
          <Avatar uri={item.avatar_url ?? undefined} fallback={initialOf(item.display_name)} size={48} />
          <View style={styles.fill}>
            <Text weight="700" numberOfLines={1}>
              {item.display_name}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {t('homeNative.performer.improvement', { value: Math.round(item.improvement) })}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Button size="sm" variant="outline" onPress={() => navigateToWebPath(`/u/${item.user_id}`)} testID={`feed-performer-${item.id}-cta`}>
            {t('newsCard.member.viewProfile')}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 16, gap: 8 },
  title: {},
  description: { lineHeight: 20 },
  performerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
});
