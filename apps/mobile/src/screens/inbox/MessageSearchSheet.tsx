/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox's
 * "Search messages" panel, the native twin of the web `MessageSearchPanel`
 * in its global form (`scope="all"`, Messages.tsx:519-527): the search box
 * (3+ characters), the filters (attachment type, from / to day), the results
 * (conversation name, date + time, snippet with the query marked), "Show
 * more", and the hint / searching / error / empty states. A result opens its
 * conversation at the message (`/inbox/u|g/<id>/msg/<messageId>`, the
 * conversation-chat lane's routes) and closes the panel.
 * The web's `<input type="date">` becomes a yyyy-mm-dd field (the kit has no
 * date picker); a day applies once it is complete, as the web input yields
 * only complete days. The in-conversation form (↑/↓ through hits) belongs to
 * the conversation-chat lane. React 19: typed with `ReactElement`.
 */
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, PressableRow, Spinner, Text, useUITheme } from '../../ports/ui';
import { InboxIcon, Input, Label } from '../../ports/inbox';
import { useInboxText } from './text';
import { SEARCH_MIN_CHARS, SEARCH_TYPES, isSearchDay, useMessageSearch, type MessageSearchResult, type SearchType } from './data/message-search';

/** The snippet with every literal, case-insensitive match of the query marked. */
export function highlightParts(snippet: string, query: string): Array<{ text: string; hit: boolean }> {
  const q = query.trim();
  if (!q) return [{ text: snippet, hit: false }];
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'giu');
  return snippet
    .split(re)
    .map((text, i) => ({ text, hit: i % 2 === 1 }))
    .filter((p) => p.text !== '');
}

export function MessageSearchSheet({
  open,
  onClose,
  onSelect,
  conversationLabel,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (result: MessageSearchResult) => void;
  conversationLabel?: (conversationKey: string) => string | undefined;
}): ReactElement {
  const { colors } = useUITheme();
  const { t, fmtDate } = useInboxText();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const fromDay = isSearchDay(from) ? from : null;
  const toDay = isSearchDay(to) ? to : null;
  const filters = useMemo(() => ({ scope: 'all', type, from: fromDay, to: toDay }), [type, fromDay, toDay]);
  const { results, status, hasMore, loadMore, tooShort } = useMessageSearch(query, filters, open);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const choose = (r: MessageSearchResult) => {
    onSelect(r);
    onClose();
  };

  let body: ReactNode = null;
  if (tooShort) {
    body = (
      <Text size="sm" muted style={styles.state} testID="message-search-too-short">
        {t('inbox.search.hint', { min: SEARCH_MIN_CHARS })}
      </Text>
    );
  } else if (status === 'loading' && results.length === 0) {
    body = (
      <View style={styles.state}>
        <Spinner accessibilityLabel={t('inbox.search.searching')} />
      </View>
    );
  } else if (status === 'error') {
    body = (
      <Text size="sm" color={colors.destructive} style={styles.state} testID="message-search-error">
        {t('inbox.search.error')}
      </Text>
    );
  } else if (status === 'done' && results.length === 0 && !hasMore) {
    body = (
      <View style={[styles.state, styles.empty]} testID="message-search-empty">
        <InboxIcon name="SearchX" size={24} color={colors.mutedForeground} />
        <Text size="sm" muted>
          {t('inbox.search.empty')}
        </Text>
      </View>
    );
  }

  return (
    <BottomSheet testID="message-search-panel" open={open} onClose={onClose} title={t('inbox.search.title')}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={[styles.searchBox, { borderColor: colors.input }]}>
          <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
          <Input
            testID="message-search-input"
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('inbox.search.placeholder')}
            accessibilityLabel={t('inbox.search.placeholder')}
            style={styles.searchInput}
          />
        </View>

        <View testID="message-search-filters" style={styles.filters}>
          <Text size="sm" muted>
            {t('inbox.search.type')}
          </Text>
          <View style={styles.chips}>
            {SEARCH_TYPES.map((v) => (
              <Button
                key={v}
                size="xs"
                testID={`message-search-type-${v}`}
                variant={type === v ? 'default' : 'secondary'}
                accessibilityState={{ selected: type === v }}
                onPress={() => setType(v)}
              >
                {t(`inbox.search.types.${v}`)}
              </Button>
            ))}
          </View>
          <View style={styles.dates}>
            <View style={styles.dateField}>
              <Label>{t('inbox.search.from')}</Label>
              <Input testID="message-search-from" value={from} onChangeText={setFrom} placeholder={t('inboxNative.datePlaceholder')} keyboardType="numbers-and-punctuation" maxLength={10} />
            </View>
            <View style={styles.dateField}>
              <Label>{t('inbox.search.to')}</Label>
              <Input testID="message-search-to" value={to} onChangeText={setTo} placeholder={t('inboxNative.datePlaceholder')} keyboardType="numbers-and-punctuation" maxLength={10} />
            </View>
          </View>
        </View>

        <View accessibilityLiveRegion="polite">
          {status === 'done' ? <Text style={styles.srOnly}>{`${t('inbox.search.results')}: ${results.length}`}</Text> : null}
        </View>

        {body}

        {results.length > 0 ? (
          <View accessibilityLabel={t('inbox.search.results')} style={[styles.results, { borderColor: colors.border }]}>
            {results.map((r) => {
              const label = conversationLabel?.(r.conversation_key);
              return (
                <PressableRow key={r.message_id} testID="message-search-result" onPress={() => choose(r)} style={[styles.result, { borderColor: colors.border }]}>
                  <View style={styles.fill}>
                    <View style={styles.resultTop}>
                      <Text size="sm" weight="500" numberOfLines={1} style={styles.fill}>
                        {label ?? t('inbox.search.conversation')}
                      </Text>
                      <Text size="xs" muted>
                        {fmtDate(r.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                      </Text>
                    </View>
                    <Text size="sm" muted numberOfLines={2}>
                      {highlightParts(r.snippet, query).map((p, i) =>
                        p.hit ? (
                          <Text key={i} size="sm" color={colors.foreground} style={{ backgroundColor: colors.muted }}>
                            {p.text}
                          </Text>
                        ) : (
                          p.text
                        ),
                      )}
                    </Text>
                  </View>
                </PressableRow>
              );
            })}
          </View>
        ) : null}

        {hasMore ? (
          <View style={styles.more}>
            <Button size="sm" variant="ghost" testID="message-search-more" disabled={status === 'loading'} onPress={() => void loadMore()}>
              {t('inbox.search.more')}
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { gap: 12, paddingBottom: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  searchInput: { flex: 1, borderWidth: 0, paddingHorizontal: 0 },
  filters: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dates: { flexDirection: 'row', gap: 8 },
  dateField: { flex: 1, gap: 4 },
  state: { paddingVertical: 24, textAlign: 'center', alignItems: 'center' },
  empty: { gap: 8 },
  results: { borderTopWidth: StyleSheet.hairlineWidth },
  result: { paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  resultTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  more: { alignItems: 'center', paddingVertical: 8 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
