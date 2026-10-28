/**
 * VTID-05296 (N-W2 community-hub) — native port of the web community members
 * directory (`src/pages/community/Members.tsx`, mobile-web branch) and the
 * profile-preview overlay (registry OVERLAY.PROFILE_PREVIEW). Sort + dance
 * filter + name/vitana search, a cursor "load more" pager, and a bottom-sheet
 * preview that opens on a card tap with a link out to the full profile.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, Avatar, Icon, TextInput, BottomSheet } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, FilterChips, CardRow, ListLoading, ListEmpty, ListError, LoadMore } from './components';
import { useMembersDirectory, type MemberRow, type MemberSort } from './data/directory';

const SORTS: MemberSort[] = ['newest', 'oldest', 'name'];
const DANCE_KEYS = ['all', 'salsa', 'tango', 'bachata', 'kizomba', 'swing', 'ballroom', 'hiphop'] as const;

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

export function MembersScreen() {
  const { t } = useI18n();
  const [sort, setSort] = useState<MemberSort>('newest');
  const [danceKey, setDanceKey] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<MemberRow | null>(null);

  const danceFilter = danceKey === 'all' ? null : danceKey;
  const { members, loading, error, hasMore, loadMore, retry } = useMembersDirectory(sort, danceFilter);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.display_name || '').toLowerCase();
      const vid = (m.vitana_id || '').toLowerCase();
      return name.includes(q) || vid.includes(q);
    });
  }, [members, search]);

  return (
    <ScreenScaffold title={t('communityHubNative.members.title')} subtitle={t('communityHubNative.members.subtitle')} testID="screen-members">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('communityHubNative.members.searchPlaceholder')}
        accessibilityLabel={t('communityHubNative.members.searchLabel')}
        testID="members-search"
      />
      <FilterChips
        groupLabel={t('communityHubNative.members.sortLabel')}
        chips={SORTS.map((s) => ({ key: s, label: t(`communityHubNative.members.sort.${s}`) }))}
        selected={sort}
        onSelect={(k) => setSort(k as MemberSort)}
        testID="members-sort"
      />
      <FilterChips
        groupLabel={t('communityHubNative.members.danceLabel')}
        chips={DANCE_KEYS.map((k) => ({ key: k, label: t(`communityHubNative.members.dance.${k}`) }))}
        selected={danceKey}
        onSelect={setDanceKey}
        testID="members-dance"
      />

      {loading && members.length === 0 ? (
        <ListLoading label={t('communityHubNative.common.loading')} />
      ) : error && members.length === 0 ? (
        <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <ListEmpty
          title={danceFilter ? t('communityHubNative.members.emptyDance') : t('communityHubNative.members.empty')}
          testID="members-empty"
        />
      ) : (
        <View style={styles.list} testID="members-list">
          {filtered.map((m) => (
            <CardRow
              key={m.vitana_id ?? `${m.registration_seq}`}
              onPress={() => setPreview(m)}
              accessibilityLabel={m.display_name ?? t('communityHubNative.members.fallbackName')}
              testID={`member-card-${m.vitana_id ?? m.registration_seq}`}
            >
              <View style={styles.memberRow}>
                <Avatar uri={m.avatar_url} fallback={initialsOf(m.display_name)} size={48} />
                <View style={styles.fill}>
                  <Text weight="600" numberOfLines={1}>
                    {m.display_name ?? t('communityHubNative.members.fallbackName')}
                  </Text>
                  {m.vitana_id ? (
                    <Text variant="caption" muted>
                      {t('communityHubNative.members.handle', { handle: m.vitana_id })}
                    </Text>
                  ) : null}
                  {m.location ? (
                    <View style={styles.metaRow}>
                      <Icon name="Compass" size={12} />
                      <Text variant="caption" muted numberOfLines={1}>
                        {m.location}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </CardRow>
          ))}
        </View>
      )}

      {hasMore && members.length > 0 ? (
        <LoadMore label={t('communityHubNative.common.loadMore')} loading={loading} onPress={loadMore} />
      ) : null}

      <BottomSheet
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.display_name ?? t('communityHubNative.members.fallbackName')}
        testID="member-preview"
      >
        {preview ? (
          <View style={styles.previewBody}>
            <Avatar uri={preview.avatar_url} fallback={initialsOf(preview.display_name)} size={64} />
            {preview.vitana_id ? (
              <Text variant="caption" muted>
                {t('communityHubNative.members.handle', { handle: preview.vitana_id })}
              </Text>
            ) : null}
            {preview.location ? <Text muted>{preview.location}</Text> : null}
            {preview.dance_preview?.variety ? (
              <Text muted>
                {[preview.dance_preview.variety, preview.dance_preview.level, preview.dance_preview.role].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <Button
              size="sm"
              disabled={!preview.vitana_id}
              onPress={() => {
                const vid = preview.vitana_id;
                setPreview(null);
                if (vid) navigateToWebPath(`/profile/${vid}`);
              }}
              testID="member-preview-view-profile"
            >
              {t('communityHubNative.members.viewProfile')}
            </Button>
          </View>
        ) : null}
      </BottomSheet>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  fill: { flex: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  previewBody: { alignItems: 'center', gap: 10 },
});
