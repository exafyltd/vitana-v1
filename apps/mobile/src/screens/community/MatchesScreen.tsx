/**
 * VTID-05296 (N-W2 community-hub) — native port of the full matches list
 * (`src/pages/MatchesPage.tsx`, `/me/matches`). Driven by the same
 * `daily_matches` source as the web; one row per real match, link to the
 * member's profile, compatibility score badge. Loading / empty / error states
 * match the web.
 */
import { StyleSheet, View } from 'react-native';
import { Text, Avatar, Icon } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, CardRow, ListLoading, ListEmpty, ListError } from './components';
import { useRealMatches, type RealMatch } from './data/matches';

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function MatchesScreen() {
  const { t } = useI18n();
  const { data: matches, isLoading, isError, refetch } = useRealMatches(50);
  const list = matches ?? [];

  return (
    <ScreenScaffold title={t('communityHubNative.matches.title')} subtitle={t('communityHubNative.matches.subtitle')} testID="screen-matches">
      {isLoading ? (
        <ListLoading label={t('communityHubNative.common.loading')} />
      ) : isError ? (
        <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <ListEmpty title={t('communityHubNative.matches.empty')} testID="matches-empty" />
      ) : (
        <View style={styles.list} testID="matches-list">
          {list.map((m) => (
            <MatchCard key={m.user_id} match={m} />
          ))}
        </View>
      )}
    </ScreenScaffold>
  );
}

function MatchCard({ match }: { match: RealMatch }) {
  const { t } = useI18n();
  const name = match.display_name || t('communityHubNative.matches.fallbackName');
  return (
    <CardRow
      onPress={() => navigateToWebPath(`/u/${match.user_id}`)}
      accessibilityLabel={name}
      testID={`match-card-${match.user_id}`}
    >
      <View style={styles.row}>
        <Avatar uri={match.avatar_url} fallback={initialsOf(name)} size={48} />
        <View style={styles.fill}>
          <Text weight="600" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" muted numberOfLines={1}>
            {match.match_reason ?? t('communityHubNative.matches.reasonDefault')}
          </Text>
          {match.location ? (
            <View style={styles.metaRow}>
              <Icon name="Compass" size={12} />
              <Text variant="caption" muted numberOfLines={1}>
                {match.location}
              </Text>
            </View>
          ) : null}
        </View>
        <Text weight="700" testID={`match-score-${match.user_id}`}>
          {t('communityHubNative.matches.score', { score: match.compatibility_score })}
        </Text>
      </View>
    </CardRow>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
});
