/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — "Search
 * this conversation", native twin of web
 * `src/components/messages/MessageSearchPanel.tsx` (VTID-05317) for a DM
 * (scope `dm:<peer>`, ConversationView.tsx:1245/:1557) or a group
 * (`group:<id>`, GroupChat.tsx:541/:550): the query field, older / newer hit
 * (↑ older, ↓ newer; past the last loaded hit the next page is fetched first),
 * the filter toggle (type, from / to day), close; the hint below 3 characters,
 * searching, error, "No messages found", the results (time + snippet with the
 * query marked), "More results". Picking a hit jumps to the message in the
 * conversation; the panel stays open (in-conversation behaviour).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Spinner, Text, TextInput, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { useI18n } from '../../i18n/I18nProvider';
import { highlightParts, SEARCH_MIN_CHARS, SEARCH_TYPES, useMessageSearch, type MessageSearchResult, type SearchType } from './data/search';

export function MessageSearchPanel({ open, onClose, scope, onSelect }: { open: boolean; onClose: () => void; scope: string; onSelect: (r: MessageSearchResult) => void }) {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [active, setActive] = useState(-1);
  const pendingOlder = useRef<number | null>(null);
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const filters = useMemo(() => ({ scope, type, from: day.test(from) ? from : null, to: day.test(to) ? to : null }), [scope, type, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const { results, status, hasMore, loadMore, tooShort } = useMessageSearch(query, filters, open);
  const filterActive = type !== 'any' || !!filters.from || !!filters.to;

  useEffect(() => {
    setActive(-1);
    pendingOlder.current = null;
  }, [query, scope, type, from, to]);
  useEffect(() => {
    setType('any');
    setFrom('');
    setTo('');
  }, [scope]);
  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(-1);
    }
  }, [open]);

  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    setActive(i);
    onSelect(r);
  };
  const step = (dir: 1 | -1) => {
    if (results.length === 0) return;
    if (dir === 1 && active === results.length - 1 && hasMore) {
      pendingOlder.current = results.length;
      void loadMore();
      return;
    }
    choose(active < 0 ? 0 : Math.max(0, Math.min(results.length - 1, active + dir)));
  };
  useEffect(() => {
    const want = pendingOlder.current;
    if (want === null || status === 'loading') return;
    pendingOlder.current = null;
    if (results[want]) choose(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, status]);

  const fmt = (iso: string) => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  return (
    <BottomSheet open={open} onClose={onClose} title={t('inbox.search.titleConversation')} testID="message-search-panel">
      <View style={styles.bar}>
        <View style={styles.flex}>
          <TextInput value={query} onChangeText={setQuery} placeholder={t('inbox.search.placeholder')} accessibilityLabel={t('inbox.search.placeholder')} autoFocus testID="message-search-input" />
        </View>
        <Pressable onPress={() => step(1)} disabled={results.length === 0 || (active === results.length - 1 && !hasMore) || status === 'loading'} accessibilityRole="button" accessibilityLabel={t('inbox.search.olderHit')} style={styles.icon} testID="message-search-older">
          <ChatIcon name="ChevronUp" size={18} />
        </Pressable>
        <Pressable onPress={() => step(-1)} disabled={results.length === 0} accessibilityRole="button" accessibilityLabel={t('inbox.search.newerHit')} style={styles.icon} testID="message-search-newer">
          <ChatIcon name="ChevronDown" size={18} />
        </Pressable>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={t('inbox.search.filters')}
          accessibilityState={{ expanded: showFilters }}
          style={[styles.icon, filterActive ? { backgroundColor: colors.secondary } : null]}
          testID="message-search-filters-toggle"
        >
          <ChatIcon name="SlidersHorizontal" size={18} />
        </Pressable>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('screens.ui.close')} style={styles.icon} testID="message-search-close">
          <ChatIcon name="X" size={18} />
        </Pressable>
      </View>
      {showFilters ? (
        <View style={styles.filters} testID="message-search-filters">
          <Text muted>{t('inbox.search.type')}</Text>
          <View style={styles.wrap}>
            {SEARCH_TYPES.map((v) => (
              <Button key={v} size="sm" variant={type === v ? 'secondary' : 'ghost'} onPress={() => setType(v)} testID={`message-search-type-${v}`}>
                {t(`inbox.search.types.${v}`)}
              </Button>
            ))}
          </View>
          <View style={styles.wrap}>
            <View style={styles.flex}>
              <Text muted>{t('inbox.search.from')}</Text>
              <TextInput value={from} onChangeText={setFrom} placeholder={t('chatNative.composer.datePlaceholder')} testID="message-search-from" />
            </View>
            <View style={styles.flex}>
              <Text muted>{t('inbox.search.to')}</Text>
              <TextInput value={to} onChangeText={setTo} placeholder={t('chatNative.composer.datePlaceholder')} testID="message-search-to" />
            </View>
          </View>
        </View>
      ) : null}
      {tooShort ? (
        <Text muted style={styles.center} testID="message-search-too-short">
          {t('inbox.search.hint', { min: SEARCH_MIN_CHARS })}
        </Text>
      ) : null}
      {status === 'loading' && results.length === 0 ? (
        <View style={styles.centerBox}>
          <Spinner accessibilityLabel={t('inbox.search.searching')} />
        </View>
      ) : null}
      {status === 'error' ? (
        <Text style={[styles.center, { color: colors.destructive }]} testID="message-search-error">
          {t('inbox.search.error')}
        </Text>
      ) : null}
      {status === 'done' && results.length === 0 && !hasMore ? (
        <View style={styles.centerBox} testID="message-search-empty">
          <ChatIcon name="SearchX" size={24} color={colors.mutedForeground} />
          <Text muted>{t('inbox.search.empty')}</Text>
        </View>
      ) : null}
      {results.length > 0 ? (
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(r) => r.message_id}
          accessibilityLabel={t('inbox.search.results')}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => choose(index)} accessibilityRole="button" accessibilityState={{ selected: index === active }} style={[styles.result, index === active ? { backgroundColor: colors.muted } : null]} testID="message-search-result">
              <Text muted style={styles.small}>
                {fmt(item.created_at)}
              </Text>
              <Text numberOfLines={2} style={styles.snippet}>
                {highlightParts(item.snippet, query).map((part, i) =>
                  i % 2 === 1 ? (
                    <Text key={i} style={[styles.mark, { backgroundColor: colors.accent }]}>
                      {part}
                    </Text>
                  ) : (
                    part
                  ),
                )}
              </Text>
            </Pressable>
          )}
        />
      ) : null}
      {hasMore ? (
        <Button variant="ghost" size="sm" onPress={() => void loadMore()} disabled={status === 'loading'} testID="message-search-more">
          {t('inbox.search.more')}
        </Button>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flex: { flex: 1, minWidth: 0 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  filters: { gap: 6, paddingVertical: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  center: { textAlign: 'center', paddingVertical: 16 },
  centerBox: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  list: { maxHeight: 360 },
  result: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8 },
  small: { fontSize: 12 },
  snippet: { fontSize: 14 },
  mark: { borderRadius: 2 },
});
