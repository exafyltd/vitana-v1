/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — `/inbox/archived`
 * (INBOX.ARCHIVED), a 1:1 port of `src/pages/messages/Archived.tsx`. The page
 * has no mobile branch (phones get its non-Spotlight layout, the Spotlight
 * frame is desktop-only) and no data behind it: the archive list, statistics
 * and switches are the web's static sample, rendered here the same way, every
 * word from the catalogs (the web's inline English sample strings live in
 * `inboxNative.archiveSample` / `archiveCategory` / `archiveType`). The
 * buttons do what the web buttons do — nothing beyond their own state
 * ("Archive Actions" only sets `archiveActionOpen`, which nothing reads).
 *
 * Layout: sub-navigation, the header (📦), the utility row ("Archive
 * Actions"), the split-bar tabs (All / Recently / By category / Settings);
 * the web's three side-by-side cards stack vertically on the phone width.
 * Documented deferrals: the utility row's ExpandableSearchButton only logs
 * its query (Archived.tsx:80-82) and UniversalCalendarButton is the calendar
 * lane's. React 19: typed with `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Avatar, Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger, Text, useUITheme } from '../../ports/ui';
import { InboxButtonIcon, InboxIcon, Input } from '../../ports/inbox';
import { InboxPage } from './components';
import { useInboxText } from './text';

type Sample = { id: string; key: 'johnson' | 'yoga' | 'martinez' | 'warriors' | 'kim'; type: 'direct' | 'group'; date: string; category: 'healthcare' | 'fitness' | 'nutrition' | 'activities' };

/** Archived.tsx:27-33, dates as ISO days. */
export const ARCHIVED_SAMPLE: readonly Sample[] = [
  { id: '1', key: 'johnson', type: 'direct', date: '2023-11-15', category: 'healthcare' },
  { id: '2', key: 'yoga', type: 'group', date: '2023-11-10', category: 'fitness' },
  { id: '3', key: 'martinez', type: 'direct', date: '2023-11-08', category: 'nutrition' },
  { id: '4', key: 'warriors', type: 'group', date: '2023-11-05', category: 'activities' },
  { id: '5', key: 'kim', type: 'direct', date: '2023-10-28', category: 'healthcare' },
];

export const ARCHIVE_CATEGORIES = ['all', 'healthcare', 'fitness', 'nutrition', 'activities'] as const;

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('');

export function ArchivedScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t, fmtDate } = useInboxText();
  const [tab, setTab] = useState('all');
  const [, setArchiveActionOpen] = useState(false);
  const [autoArchive, setAutoArchive] = useState(true);
  const [keepImportant, setKeepImportant] = useState(true);

  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <InboxPage
      testID="screen-inbox-archived"
      active="archived"
      emoji="📦"
      title={t('screens.messages.neverLoseImportantConversations')}
      description={t('inboxNative.archivedDescription')}
      actions={
        <Button size="sm" testID="archived-actions" onPress={() => setArchiveActionOpen(true)}>
          <InboxButtonIcon name="Plus" />
          {t('screens.messages.archiveActions')}
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={styles.tabs}>
          <TabsTrigger value="all" testID="archived-tab-all">
            {t('screens.messages.allArchives')}
          </TabsTrigger>
          <TabsTrigger value="recent" testID="archived-tab-recent">
            {t('screens.messages.recentlyArchived')}
          </TabsTrigger>
          <TabsTrigger value="category" testID="archived-tab-category">
            {t('screens.messages.byCategory')}
          </TabsTrigger>
          <TabsTrigger value="settings" testID="archived-tab-settings">
            {t('screens.messages.settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <View style={styles.stack}>
            <View style={card} testID="archived-categories">
              <Text weight="600">{t('screens.messages.archivedMessages')}</Text>
              <View style={[styles.searchBox, { borderColor: colors.input }]}>
                <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
                <Input placeholder={t('screens.messages.searchArchives')} style={styles.searchInput} />
              </View>
              {ARCHIVE_CATEGORIES.map((c) => (
                <Button key={c} variant="ghost" style={styles.start} testID={`archived-category-${c}`}>
                  {t(`inboxNative.archiveCategory.${c}`)}
                </Button>
              ))}
            </View>

            <View style={card} testID="archived-list">
              <View style={styles.listHeader}>
                <Text weight="500" style={styles.fill}>
                  {t('screens.messages.allArchivedConversations')}
                </Text>
                <Button variant="ghost" size="sm">
                  {t('screens.messages.export')}
                </Button>
                <Button variant="ghost" size="sm">
                  {t('screens.messages.deleteSelected')}
                </Button>
              </View>
              {ARCHIVED_SAMPLE.map((chat) => {
                const name = t(`inboxNative.archiveSample.${chat.key}Name`);
                return (
                  <View key={chat.id} testID={`archived-row-${chat.id}`} style={[styles.row, { borderTopColor: colors.border }]}>
                    <Avatar fallback={chat.type === 'group' ? '👥' : initials(name)} size={40} />
                    <View style={styles.fill}>
                      <View style={styles.rowTitle}>
                        <Text weight="500">{name}</Text>
                        <Badge variant="outline">
                          <Text size="xs">{t(`inboxNative.archiveType.${chat.type}`)}</Text>
                        </Badge>
                        <Badge variant="secondary">
                          <Text size="xs">{t(`inboxNative.archiveCategory.${chat.category}`)}</Text>
                        </Badge>
                      </View>
                      <Text size="sm" muted numberOfLines={1}>
                        {t(`inboxNative.archiveSample.${chat.key}Message`)}
                      </Text>
                      <Text size="xs" muted>
                        {fmtDate(new Date(`${chat.date}T12:00:00`), { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <Button variant="ghost" size="sm">
                      {t('screens.messages.restore')}
                    </Button>
                    <Button variant="ghost" size="icon" accessibilityLabel={t('inboxNative.moreOptions')}>
                      <InboxIcon name="MoreHorizontal" size={16} />
                    </Button>
                  </View>
                );
              })}
            </View>

            <View style={card} testID="archived-management">
              <Text weight="600">{t('screens.messages.archiveManagement')}</Text>
              <Text weight="500">{t('screens.messages.quickActions')}</Text>
              <Button variant="outline" style={styles.start}>
                <InboxButtonIcon name="Archive" />
                {t('screens.messages.archiveCurrentChat')}
              </Button>
              <Button variant="outline" style={styles.start}>
                {t('screens.messages.exportArchives')}
              </Button>
              <Button variant="outline" style={styles.start}>
                {t('screens.messages.importArchives')}
              </Button>
              <Text weight="500">{t('screens.messages.archiveStatistics')}</Text>
              {(
                [
                  ['totalArchived', 'text42Conversations'],
                  ['thisMonth', 'text5Conversations'],
                  ['storageUsed', 'text125Mb'],
                ] as const
              ).map(([label, value]) => (
                <View key={label} style={styles.stat}>
                  <Text size="sm" muted>
                    {t(`screens.messages.${label}`)}
                  </Text>
                  <Text size="sm" weight="500">
                    {t(`screens.messages.${value}`)}
                  </Text>
                </View>
              ))}
              <Text weight="500">{t('screens.messages.autoarchiveSettings')}</Text>
              <View style={styles.stat}>
                <Text size="sm" style={styles.fill}>
                  {t('screens.messages.autoarchiveAfter30Days')}
                </Text>
                <Switch testID="archived-auto" value={autoArchive} onValueChange={setAutoArchive} accessibilityLabel={t('screens.messages.autoarchiveAfter30Days')} />
              </View>
              <View style={styles.stat}>
                <Text size="sm" style={styles.fill}>
                  {t('screens.messages.keepImportantChats')}
                </Text>
                <Switch testID="archived-keep" value={keepImportant} onValueChange={setKeepImportant} accessibilityLabel={t('screens.messages.keepImportantChats')} />
              </View>
            </View>
          </View>
        </TabsContent>

        <TabsContent value="recent">
          <View style={card} testID="archived-recent">
            <Text muted>{t('screens.messages.recentlyArchivedConversationsWillAppearHere')}</Text>
          </View>
        </TabsContent>
        <TabsContent value="category">
          <View style={card} testID="archived-category">
            <Text muted>{t('screens.messages.categorybasedArchiveViewWillAppearHere')}</Text>
          </View>
        </TabsContent>
        <TabsContent value="settings">
          <View style={card} testID="archived-settings">
            <Text muted>{t('screens.messages.archiveSettingsWillAppearHere')}</Text>
          </View>
        </TabsContent>
      </Tabs>
    </InboxPage>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  tabs: { flexWrap: 'wrap', marginBottom: 12 },
  stack: { gap: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, borderWidth: 0, paddingHorizontal: 0 },
  start: { justifyContent: 'flex-start' },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  rowTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
