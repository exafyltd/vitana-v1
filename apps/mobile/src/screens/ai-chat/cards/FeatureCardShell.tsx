/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — native twin of the web
 * Unified Card System shell (`VitanaRecommendationCard` +
 * `VitanaRecommendationHeader` + the shaped action button of
 * `VitanaActionCard`): the "Vitana" header with the feature badge, the X
 * dismiss at the end edge, the eyebrow, headline + subtext, and the action
 * button. The whole card opens the destination; the X and the button are their
 * own targets (web `stopPropagation`). Tokens only, start/end only.
 */
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { AiChatIcon, ButtonIcon } from '../../../ports/ai-chat';
import { useI18n } from '../../../i18n/I18nProvider';

export type FeatureCardShellProps = {
  cardType: string;
  /** Feature badge: icon + label key (web `FEATURE_CONFIG`). */
  badgeIcon: string;
  badgeLabelKey: string;
  eyebrow: string;
  headline: ReactNode;
  subtext?: string | null;
  actionIcon: string;
  actionLabel: string;
  onAction: () => void;
  onOpen: () => void;
  onDismiss?: () => void;
};

export function FeatureCardShell({
  cardType,
  badgeIcon,
  badgeLabelKey,
  eyebrow,
  headline,
  subtext,
  actionIcon,
  actionLabel,
  onAction,
  onOpen,
  onDismiss,
}: FeatureCardShellProps): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Pressable
      testID={`vitana-card-${cardType}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderStartColor: colors.accent, borderRadius: radius.lg * 2 }]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={[styles.orb, { backgroundColor: colors.primary }]} accessibilityLabel={t('screens.vitanaIdentity.orbAlt')} accessibilityRole="image" />
          <Text size="sm" weight="600" color={colors.primary}>
            {t('screens.vitanaIdentity.vitana')}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <AiChatIcon name={badgeIcon} size={12} color={colors.primary} />
          <Text size="xs" weight="600" color={colors.primary}>
            {t(badgeLabelKey)}
          </Text>
        </View>
        {onDismiss ? (
          <Pressable
            testID={`vitana-card-${cardType}-dismiss`}
            accessibilityRole="button"
            accessibilityLabel={t('screens.vitanaIdentity.dismissCard')}
            hitSlop={8}
            onPress={onDismiss}
            style={styles.dismiss}
          >
            <AiChatIcon name="X" size={14} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <Text size="xs" weight="600" muted style={styles.eyebrow}>
        {eyebrow}
      </Text>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text size="sm" weight="700" numberOfLines={2}>
            {headline}
          </Text>
          {subtext ? (
            <Text size="xs" muted numberOfLines={2}>
              {subtext}
            </Text>
          ) : null}
        </View>
        <Button size="sm" onPress={onAction} testID={`vitana-card-action-${cardType}`}>
          <ButtonIcon name={actionIcon} size={14} />
          {actionLabel}
        </Button>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderStartWidth: 4, padding: 10, gap: 4, minHeight: 138 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingEnd: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orb: { width: 24, height: 24, borderRadius: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  dismiss: { position: 'absolute', top: 0, end: 0, padding: 4 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
