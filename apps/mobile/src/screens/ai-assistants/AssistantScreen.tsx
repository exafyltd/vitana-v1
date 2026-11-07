/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — `/assistant`, the native
 * twin of the mobile-web branch of `src/pages/assistant/AIAssistant.tsx`
 * (route `src/App.tsx:1470-1474`; the Spotlight branch is desktop + flag
 * only). One screen whose `tab` search param selects the panel, default
 * `voice`, so the six ledger rows (`ASSISTANT.OVERVIEW` + `?tab=voice|ai|
 * autopilot|proactive|referrals`) are this one file. A tab press writes the
 * param back (web `setSearchParams({ tab })`).
 *
 * Layout, as on the phone web: the mobile `StandardHeader` (the title only —
 * `StandardHeader.tsx:41-49` drops the emoji and description under
 * `useIsMobile()`), the horizontally scrolling tab strip with the short
 * mobile labels, then the active panel. The header and the strip stay
 * mounted while the preferences load and only the pane shows the form
 * skeleton; when the read fails (or there is no member) the web renders
 * nothing, and so does this screen.
 *
 * `ASSISTANT.VOICE` is the voice SETTINGS tab, not the live ORB session
 * (requirements R0.3, out of scope). React 19 `ReactElement`.
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useUserPreferences } from './data/hooks';
import { VoiceSettingsPanel } from './panels/VoiceSettingsPanel';
import { AIModelSettingsPanel } from './panels/AIModelSettingsPanel';
import { AutopilotSettingsPanel } from './panels/AutopilotSettingsPanel';
import { ProactiveTalkingPanel } from './panels/ProactiveTalkingPanel';
import { VaeaConfigPanel } from './panels/VaeaConfigPanel';

export const ASSISTANT_TABS = ['voice', 'ai', 'autopilot', 'proactive', 'referrals'] as const;
export type AssistantTab = (typeof ASSISTANT_TABS)[number];

/** web `searchParams.get('tab') || 'voice'` (an unknown value selects no panel, as on the web). */
export function activeTab(param: string | string[] | undefined): string {
  const v = Array.isArray(param) ? param[0] : param;
  return v || 'voice';
}

/** The mobile labels (`md:hidden` spans); "AI" is the catalog's tab label (the web hardcodes it). */
const TAB_LABELS: Record<AssistantTab, string> = {
  voice: 'screens.assistant.voice',
  ai: 'spotlightTierB.ai.assistantTabAi',
  autopilot: 'screens.assistant.autopilot',
  proactive: 'screens.assistant.proactive',
  referrals: 'screens.assistant.referrals',
};

function FormSkeleton(): ReactElement {
  return (
    <View style={styles.skeleton} testID="assistant-loading">
      <Skeleton style={styles.skelTitle} />
      <Skeleton style={styles.skelLine} />
      <Skeleton style={styles.skelField} />
      <Skeleton style={styles.skelField} />
      <Skeleton style={styles.skelField} />
    </View>
  );
}

export function AssistantScreen(): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const tab = activeTab(params.tab);
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();

  if (!isLoading && !preferences) return null;

  const panelProps = preferences ? { preferences, isUpdating, updatePreferences } : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-assistant">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="assistant-scroll">
        <View style={styles.header}>
          <Text size="lg" weight="700" accessibilityRole="header">
            {t('screens.assistant.aiAssistant')}
          </Text>
        </View>

        <Tabs value={tab} onValueChange={(value) => router.setParams({ tab: value } as never)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="assistant-tabs-scroll">
            <TabsList style={styles.tabList} testID="assistant-tabs">
              {ASSISTANT_TABS.map((value) => (
                <TabsTrigger key={value} value={value} style={styles.trigger} testID={`assistant-tab-${value}`} accessibilityLabel={t(TAB_LABELS[value])}>
                  {t(TAB_LABELS[value])}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollView>

          {!panelProps ? (
            <FormSkeleton />
          ) : (
            <>
              <TabsContent value="voice" style={styles.pane}>
                <VoiceSettingsPanel {...panelProps} />
              </TabsContent>
              <TabsContent value="ai" style={styles.pane}>
                <AIModelSettingsPanel {...panelProps} />
              </TabsContent>
              <TabsContent value="autopilot" style={styles.pane}>
                <AutopilotSettingsPanel {...panelProps} />
              </TabsContent>
              <TabsContent value="proactive" style={styles.pane}>
                <ProactiveTalkingPanel {...panelProps} />
              </TabsContent>
              <TabsContent value="referrals" style={styles.pane}>
                <VaeaConfigPanel />
              </TabsContent>
            </>
          )}
        </Tabs>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, paddingBottom: 128, gap: 24 },
  header: { paddingTop: 4 },
  tabList: { justifyContent: 'flex-start', gap: 4 },
  trigger: { flex: 0, flexShrink: 0 },
  pane: { marginTop: 24, gap: 16 },
  skeleton: { marginTop: 24, gap: 12 },
  skelTitle: { height: 24, width: '50%' },
  skelLine: { height: 14, width: '80%' },
  skelField: { height: 40 },
});
