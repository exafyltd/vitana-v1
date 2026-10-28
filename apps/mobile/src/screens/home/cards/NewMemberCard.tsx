/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the feed's new-member card, a
 * token-styled twin of the web `src/components/home/NewMemberCard.tsx`. Greets
 * a member who joined recently (VTID-04584): avatar, name, an invitation line,
 * the member's bio, and two actions — say hello (opens the DM) and view
 * profile — the same destinations and catalog keys the news reader's member
 * actions use. React 19: typed with `ReactElement`.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useI18n } from '../../../i18n/I18nProvider';
import type { NewMemberFeedItem } from '../../../ports/feed';

function initialOf(name: string | null): string {
  return (name || '•').trim().charAt(0).toUpperCase();
}

export function NewMemberCard({ item }: { item: NewMemberFeedItem }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const name = item.display_name?.trim() || t('homeNative.newMember.fallbackName');

  return (
    <View
      testID={`feed-new-member-${item.id}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <View style={styles.header}>
        <Avatar uri={item.avatar_url ?? undefined} fallback={initialOf(item.display_name)} size={48} />
        <View style={styles.fill}>
          <Text variant="label" style={{ color: colors.primary }} numberOfLines={1}>
            {t('homeNative.newMember.badge')}
          </Text>
          <Text weight="700" numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      {item.bio ? (
        <Text variant="body" muted numberOfLines={3} style={styles.bio}>
          {item.bio}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button size="sm" onPress={() => navigateToWebPath(`/inbox/u/${item.user_id}`)} testID={`feed-new-member-${item.id}-hello`}>
          {t('newsCard.member.sayHello')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => navigateToWebPath(`/u/${item.user_id}`)}
          testID={`feed-new-member-${item.id}-profile`}
        >
          {t('newsCard.member.viewProfile')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
  bio: { lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
