/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) —
 * `/inbox/inspiration` (INBOX.INSPIRATION), a 1:1 port of
 * `src/pages/messages/Inspiration.tsx` (no mobile branch; phones get its
 * non-Spotlight layout): sub-navigation, the header (💡), the utility row
 * ("Template Actions" → the `InspirationMasterActionPopup` twin as a bottom
 * sheet), the split-bar tabs — Templates (the four categories with three
 * templates each, "Copy" to the clipboard, "Send"), My Favorites, Recently
 * Used and Custom Messages (each an empty panel with a 0 badge).
 * "Send" and the five popup actions only log on the web (Inspiration.tsx:189,
 * InspirationMasterActionPopup.tsx:22-25), so here they do nothing beyond
 * closing the popup. Documented deferrals: the utility row's
 * ExpandableSearchButton only logs (Inspiration.tsx:136-139) and
 * UniversalCalendarButton is the calendar lane's. React 19: `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, BottomSheet, Button, Tabs, TabsContent, TabsList, TabsTrigger, Text, useUITheme } from '../../ports/ui';
import { InboxButtonIcon, InboxIcon, copyToClipboard } from '../../ports/inbox';
import { InboxPage } from './components';
import { useInboxText } from './text';

/** Inspiration.tsx:22-55. */
export const INSPIRATION_TEMPLATES: ReadonlyArray<{ categoryKey: string; templates: ReadonlyArray<{ textKey: string; icon: string }> }> = [
  {
    categoryKey: 'screens.messages.inspirationCategory_morningMotivation',
    templates: [
      { textKey: 'screens.messages.inspirationTpl_morning1', icon: '☀' },
      { textKey: 'screens.messages.inspirationTpl_morning2', icon: '🌅' },
      { textKey: 'screens.messages.inspirationTpl_morning3', icon: '🙏' },
    ],
  },
  {
    categoryKey: 'screens.messages.inspirationCategory_goalSupport',
    templates: [
      { textKey: 'screens.messages.inspirationTpl_goal1', icon: '🎯' },
      { textKey: 'screens.messages.inspirationTpl_goal2', icon: '📈' },
      { textKey: 'screens.messages.inspirationTpl_goal3', icon: '⭐' },
    ],
  },
  {
    categoryKey: 'screens.messages.inspirationCategory_healthCheckins',
    templates: [
      { textKey: 'screens.messages.inspirationTpl_checkin1', icon: '💙' },
      { textKey: 'screens.messages.inspirationTpl_checkin2', icon: '🌸' },
      { textKey: 'screens.messages.inspirationTpl_checkin3', icon: '🌿' },
    ],
  },
  {
    categoryKey: 'screens.messages.inspirationCategory_celebrations',
    templates: [
      { textKey: 'screens.messages.inspirationTpl_celebrate1', icon: '🎉' },
      { textKey: 'screens.messages.inspirationTpl_celebrate2', icon: '👏' },
      { textKey: 'screens.messages.inspirationTpl_celebrate3', icon: '🌟' },
    ],
  },
];

/** InspirationMasterActionPopup.tsx:33-82. */
export const INSPIRATION_ACTIONS: ReadonlyArray<{ id: string; icon: string; labelKey: string }> = [
  { id: 'create-template', icon: 'Plus', labelKey: 'screens.messages.createTemplate' },
  { id: 'edit-template', icon: 'Edit3', labelKey: 'screens.messages.editTemplate' },
  { id: 'copy-favorites', icon: 'Copy', labelKey: 'screens.messages.copyFavorites' },
  { id: 'save-collection', icon: 'Bookmark', labelKey: 'screens.messages.saveCollection' },
  { id: 'ai-suggestions', icon: 'Sparkles', labelKey: 'screens.messages.aiSuggestions' },
];

const EMPTY_TABS: ReadonlyArray<{ value: string; icon: string; tint: 'statusError' | 'statusInfo' | 'statusSuccess'; titleKey: string; bodyKey: string }> = [
  { value: 'favorites', icon: 'Heart', tint: 'statusError', titleKey: 'screens.messages.myFavoriteTemplates', bodyKey: 'screens.messages.yourSavedFavoriteTemplatesWillAppear' },
  { value: 'recent', icon: 'Clock', tint: 'statusInfo', titleKey: 'screens.messages.recentlyUsedTemplates', bodyKey: 'screens.messages.templatesYouVeUsedRecentlyWill' },
  { value: 'custom', icon: 'Edit', tint: 'statusSuccess', titleKey: 'screens.messages.customMessages2', bodyKey: 'screens.messages.yourCustomCreatedMessagesWillAppear' },
];

export function InspirationScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t } = useInboxText();
  const [tab, setTab] = useState('templates');
  const [actionsOpen, setActionsOpen] = useState(false);
  const panel = [styles.panel, { backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <InboxPage
      testID="screen-inbox-inspiration"
      active="inspiration"
      emoji="💡"
      title={t('screens.messages.communicationInspiration')}
      description={t('inboxNative.inspirationDescription')}
      actions={
        <Button size="sm" testID="inspiration-actions" onPress={() => setActionsOpen(true)}>
          <InboxButtonIcon name="Plus" />
          {t('screens.messages.templateActions')}
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={styles.tabs}>
          <TabsTrigger value="templates" testID="inspiration-tab-templates">
            {t('screens.messages.templates')}
          </TabsTrigger>
          <TabsTrigger value="favorites" testID="inspiration-tab-favorites">
            {t('screens.messages.myFavorites')}
          </TabsTrigger>
          <TabsTrigger value="recent" testID="inspiration-tab-recent">
            {t('screens.messages.recentlyUsed')}
          </TabsTrigger>
          <TabsTrigger value="custom" testID="inspiration-tab-custom">
            {t('screens.messages.customMessages')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <View style={styles.stack} testID="inspiration-templates">
            {INSPIRATION_TEMPLATES.map((category) => (
              <View key={category.categoryKey} style={panel}>
                <View style={styles.panelTitle}>
                  <InboxIcon name="Lightbulb" size={20} color={colors.statusWarning} />
                  <Text weight="600">{t(category.categoryKey)}</Text>
                </View>
                {category.templates.map((tpl) => {
                  const text = t(tpl.textKey);
                  const id = tpl.textKey.split('_').pop();
                  return (
                    <View key={tpl.textKey} testID={`inspiration-template-${id}`} style={[styles.template, { borderColor: colors.border }]}>
                      <View style={styles.templateText}>
                        <Text size="xl" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                          {tpl.icon}
                        </Text>
                        <Text size="sm" style={styles.fill}>
                          {text}
                        </Text>
                      </View>
                      <View style={styles.templateActions}>
                        <Button variant="outline" size="sm" testID={`inspiration-copy-${id}`} onPress={() => copyToClipboard(text)}>
                          <InboxButtonIcon name="Copy" size={12} />
                          {t('screens.messages.copy')}
                        </Button>
                        <Button size="sm" testID={`inspiration-send-${id}`}>
                          <InboxButtonIcon name="Send" size={12} />
                          {t('screens.messages.send')}
                        </Button>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </TabsContent>

        {EMPTY_TABS.map((e) => (
          <TabsContent key={e.value} value={e.value}>
            <View style={panel} testID={`inspiration-${e.value}`}>
              <View style={styles.panelTitle}>
                <InboxIcon name={e.icon} size={20} color={colors[e.tint]} />
                <Text weight="600">{t(e.titleKey)}</Text>
                <Badge variant="secondary">
                  <Text size="xs">0</Text>
                </Badge>
              </View>
              <Text muted style={styles.emptyText}>
                {t(e.bodyKey)}
              </Text>
            </View>
          </TabsContent>
        ))}
      </Tabs>

      <BottomSheet testID="inspiration-actions-sheet" open={actionsOpen} onClose={() => setActionsOpen(false)} title={t('screens.messages.inspirationActions')}>
        <View style={styles.grid}>
          {INSPIRATION_ACTIONS.map((a) => (
            <Button key={a.id} variant="outline" testID={`inspiration-action-${a.id}`} onPress={() => setActionsOpen(false)} style={styles.gridButton}>
              <InboxButtonIcon name={a.icon} size={20} />
              {t(a.labelKey)}
            </Button>
          ))}
        </View>
      </BottomSheet>
    </InboxPage>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  tabs: { flexWrap: 'wrap', marginBottom: 12 },
  stack: { gap: 24 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  panelTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  template: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 12 },
  templateText: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  templateActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  emptyText: { textAlign: 'center', paddingVertical: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridButton: { width: '47%', height: 64, flexDirection: 'column', gap: 8 },
});
