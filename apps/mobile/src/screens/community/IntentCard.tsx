/**
 * VTID-05296 (N-W2 community-hub) — native twin of the web `IntentCard`
 * (`src/components/intents/IntentCard.tsx`) as used on the intent board, My
 * Posts and the match detail: a kind pill, the title and a scope excerpt, with
 * an optional tap target. Built on the ports layer + `@vitana/ui` only.
 */
import { StyleSheet, View } from 'react-native';
import { Badge, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { CardRow } from './components';
import type { UserIntent } from './data/intents';

const KIND_KEYS: Record<string, string> = {
  commercial_buy: 'communityHubNative.intents.kind.commercial_buy',
  commercial_sell: 'communityHubNative.intents.kind.commercial_sell',
  activity_seek: 'communityHubNative.intents.kind.activity_seek',
  partner_seek: 'communityHubNative.intents.kind.partner_seek',
  social_seek: 'communityHubNative.intents.kind.social_seek',
  mutual_aid: 'communityHubNative.intents.kind.mutual_aid',
};

export function IntentCard({ intent, onPress, testID }: { intent: UserIntent; onPress?: () => void; testID?: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const kindKey = KIND_KEYS[intent.intent_kind];
  const body = (
    <>
      <Badge variant="secondary">{kindKey ? t(kindKey) : intent.intent_kind}</Badge>
      <Text weight="600" style={styles.title}>
        {intent.title}
      </Text>
      {intent.scope ? (
        <Text muted numberOfLines={2} style={styles.scope}>
          {intent.scope}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <CardRow onPress={onPress} accessibilityLabel={intent.title} testID={testID ?? `intent-card-${intent.intent_id}`}>
        {body}
      </CardRow>
    );
  }
  return (
    <View style={[styles.staticCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID={testID ?? `intent-card-${intent.intent_id}`}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  scope: { marginTop: 4 },
  staticCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
});
