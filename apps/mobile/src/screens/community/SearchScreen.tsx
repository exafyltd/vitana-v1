/**
 * VTID-05296 (N-W2 community-hub) — native port of the web global search
 * (`src/pages/Search.tsx`). The real, data-backed path: a query box over the
 * visible community member directory (web `useCommunityMembers`), each result
 * linking to the member's profile. The web screen's mock content/groups/health
 * samples are not real data (the Spotlight branch drops them for the same
 * reason, SR-24), so the native port surfaces the real member results only.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, Avatar, TextInput } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, CardRow, ListLoading, ListEmpty, ListError } from './components';
import { useMemberSearch } from './data/directory';

function initialsOf(name: string | null): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '?'
  );
}

export function SearchScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);

  const { data: members = [], isLoading, isError, refetch } = useMemberSearch(query);

  return (
    <ScreenScaffold title={t('communityHubNative.search.title')} subtitle={t('communityHubNative.search.subtitle')} testID="screen-search">
      <View style={styles.searchRow}>
        <View style={styles.fill}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('communityHubNative.search.placeholder')}
            accessibilityLabel={t('communityHubNative.search.inputLabel')}
            onSubmitEditing={() => setQuery(draft)}
            returnKeyType="search"
            testID="search-input"
          />
        </View>
        <Button size="sm" onPress={() => setQuery(draft)} testID="search-submit">
          {t('communityHubNative.search.submit')}
        </Button>
      </View>

      {isLoading ? (
        <ListLoading label={t('communityHubNative.common.loading')} />
      ) : isError ? (
        <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />
      ) : members.length === 0 ? (
        <ListEmpty
          title={t('communityHubNative.search.emptyTitle')}
          description={t('communityHubNative.search.emptyDesc')}
          testID="search-empty"
        />
      ) : (
        <View style={styles.list} testID="search-list">
          {members.map((m) => {
            const name = m.display_name ?? t('communityHubNative.search.fallbackName');
            return (
              <CardRow
                key={m.user_id}
                onPress={() => navigateToWebPath(`/u/${m.user_id}`)}
                accessibilityLabel={name}
                testID={`search-result-${m.user_id}`}
              >
                <View style={styles.resultRow}>
                  <Avatar uri={m.avatar_url} fallback={initialsOf(m.display_name)} size={44} />
                  <View style={styles.fill}>
                    <Text weight="600" numberOfLines={1}>
                      {name}
                    </Text>
                    <Text variant="caption" muted>
                      {t('communityHubNative.search.memberMeta')}
                    </Text>
                  </View>
                </View>
              </CardRow>
            );
          })}
        </View>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
  list: { gap: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
});
