/**
 * VTID-05296 (N-W2 community-hub) — native port of the web intent match detail
 * (`src/pages/IntentMatchDetail.tsx`, mobile-web branch). The intent itself,
 * then its matches as cards. Loading / not-found / no-matches states match the
 * web. Deep-link target for `/intents/match/:id`.
 */
import { StyleSheet, View } from 'react-native';
import { Button, Text, Avatar } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, CardRow, ListLoading, ListEmpty, ListError } from './components';
import { IntentCard } from './IntentCard';
import { useIntentDetail, type IntentMatch } from './data/intents';

export function IntentMatchDetailScreen({ id }: { id: string | undefined }) {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = useIntentDetail(id);

  return (
    <ScreenScaffold
      title={t('communityHubNative.intentMatch.title')}
      action={
        <Button variant="ghost" size="sm" onPress={() => navigateToWebPath('/intents/mine')} testID="intent-match-back">
          {t('communityHubNative.intentMatch.backMine')}
        </Button>
      }
      testID="screen-intent-match"
    >
      {isLoading ? (
        <ListLoading label={t('communityHubNative.common.loading')} />
      ) : isError || !data ? (
        <ListEmpty title={t('communityHubNative.intentMatch.notFound')} testID="intent-match-not-found" />
      ) : (
        <View style={styles.body}>
          <IntentCard intent={data.intent} />
          <Text weight="600">{t('communityHubNative.intentMatch.matchesCount', { count: data.matches.length })}</Text>
          {data.matches.length === 0 ? (
            <ListEmpty title={t('communityHubNative.intentMatch.noMatches')} testID="intent-match-no-matches" />
          ) : (
            <View style={styles.list} testID="intent-match-list">
              {data.matches.map((m) => (
                <MatchRow key={m.match_id} match={m} />
              ))}
            </View>
          )}
        </View>
      )}
      {isError ? (
        <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />
      ) : null}
    </ScreenScaffold>
  );
}

function MatchRow({ match }: { match: IntentMatch }) {
  const { t } = useI18n();
  const name = match.partner_display_name ?? match.partner_intent_title ?? t('communityHubNative.findPartner.matchFallback');
  return (
    <CardRow onPress={() => undefined} accessibilityLabel={name} testID={`intent-match-row-${match.match_id}`}>
      <View style={styles.matchRow}>
        <Avatar uri={match.partner_avatar_url} fallback={name.slice(0, 1).toUpperCase()} size={44} />
        <View style={styles.fill}>
          <Text weight="600" numberOfLines={1}>
            {name}
          </Text>
          {match.partner_intent_scope ? (
            <Text variant="caption" muted numberOfLines={2}>
              {match.partner_intent_scope}
            </Text>
          ) : null}
        </View>
        <Text weight="700">{t('communityHubNative.findPartner.scorePercent', { score: Math.round(match.score ?? 0) })}</Text>
      </View>
    </CardRow>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  list: { gap: 12 },
  fill: { flex: 1 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
});
