/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai/companion`
 * (AI.COMPANION), twin of the web `src/pages/ai/Companion.tsx` phone branch:
 * on open it completes the member's onboarding recommendation (web
 * `completeBySourceRef('onboarding_maxina')`). The AI sub-navigation, the
 * header card and the live Index card, then — stacked as on a phone (the
 * web's `lg:flex-row` sidebar falls below the chat) — the AI Health Coach
 * chat (C-021), Vitana Index mini (742, up — C-022), the four companion
 * suggestions (C-023), the Autopilot widget (C-024), and the card stack: the
 * Autopilot activity log (C-022, `chat.autopilotLog`), Memory recall
 * (C-023, `chat.memoryPeek`), Personalized storytelling (C-024), Progress
 * tracking (C-025), Smart calendar (C-026), the nutrition Lifestyle plan
 * (C-027) and Daily motivation (C-028). The web's English literals
 * ("AI-generated wellness suggestion", "Do Now", "Recall", the two
 * autopilot suggestions) come from the catalogs.
 */
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { chat, useCoachPalette } from '../../ports/ai-coach';
import { CardStack, CoachScaffold } from './components';
import { useCoachText } from './text';
import { useVitanaIndex } from './data/hooks';
import { useCompleteOnOpen } from './data/celebrate';
import { CrossoverCard } from './cards/CrossoverCard';
import { SmartSuggestions } from './cards/templates';
import { LifestylePlanCard, MotivationCard, ProgressStreaksCard, SmartCalendarCard } from './cards/crossover';
import { AutopilotWidget, VitanaIndexMini } from './cards/widgets';
import { HealthCoachChat } from './cards/HealthCoachChat';
import { ConfettiBurst } from './cards/Confetti';

/** The web handlers only log analytics. */
const noop = () => undefined;

/** Mock companion data (Companion.tsx:62-70). */
const COMPANION_INDEX = 742;
const COMPANION_SUGGESTIONS = ['companionSugg_breathing', 'companionSugg_water', 'companionSugg_posture', 'companionSugg_workout'];

export function CompanionScreen(): ReactElement {
  const { t, fmtNumber } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const { index, isLoading } = useVitanaIndex();
  const { burst, burstDone } = useCompleteOnOpen('onboarding_maxina', t);
  const ai = (k: string, params?: Record<string, string>) => t(`screens.ai.${k}`, params);

  return (
    <View style={styles.fill}>
      <CoachScaffold
        active="companion"
        header="card"
        title={ai('aiCompanion')}
        description={ai('yourPersonalAiWellnessCompanionFor')}
        indexValue={isLoading || !index ? '…' : fmtNumber(index.total)}
        testID="screen-ai-companion"
      >
        <View style={styles.top}>
          <HealthCoachChat onSendMessage={noop} onStartVoiceCall={noop} onStartVideoCall={noop} />
          <View style={styles.side}>
            <VitanaIndexMini score={COMPANION_INDEX} trend="up" />
            <SmartSuggestions
              testID="card-companion-suggestions"
              maxItems={4}
              suggestions={COMPANION_SUGGESTIONS.map((k) => ({ title: ai(k), description: t('aiCoachNative.companion.suggestionDescription'), type: 'action' as const, priority: 'medium' as const, action: t('autopilot.widget.doNow') }))}
            />
            <AutopilotWidget suggestions={[t('aiCoachNative.companion.autopilotMeditation'), t('aiCoachNative.companion.autopilotHydration')]} isEnabled onToggle={noop} />
          </View>
        </View>
        <CardStack testID="ai-companion-cards">
          <CrossoverCard
            icon="Zap"
            category="autopilot"
            title={ai('autopilotActivityLog')}
            subtitle={ai('subtitle_recentAiActions')}
            buttonText={ai('button_viewFullLog')}
            onButtonClick={noop}
            testID="card-autopilot-log"
            content={
              <ScrollView style={styles.log} contentContainerStyle={styles.list} nestedScrollEnabled>
                {chat.autopilotLog.map((e) => (
                  <Pressable key={e.id} accessibilityRole="button" onPress={noop} style={[styles.entry, { backgroundColor: p.alpha(colors.background, 0.5), borderColor: colors.border }]} testID="autopilot-log-entry">
                    <View style={styles.between}>
                      <Text size="xs" weight="500" style={styles.shrink}>
                        {e.action}
                      </Text>
                      <Text size="xs" muted>
                        {e.timestamp}
                      </Text>
                    </View>
                    <Text size="xs" muted>
                      {e.reason}
                    </Text>
                    <Text size="xs" color={p.calendarSuccess}>
                      {ai('impactImpact', { impact: e.impact })}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            }
          />
          <SmartSuggestions
            testID="card-memory-recall"
            maxItems={5}
            suggestions={chat.memoryPeek.map((m) => ({ title: m.key, description: m.value, type: 'action' as const, priority: 'low' as const, action: t('aiCoachNative.companion.recall'), onAction: noop }))}
          />
          <SmartSuggestions
            testID="card-storytelling"
            maxItems={2}
            suggestions={[
              { title: ai('storyTitle_thisWeeksJourney'), description: ai('storyDesc_thisWeeksJourney'), type: 'insight', priority: 'high', action: ai('actionLabel_readFullStory'), onAction: noop },
              { title: ai('storyTitle_patternDiscovery'), description: ai('storyDesc_patternDiscovery'), type: 'insight', priority: 'medium', action: ai('actionLabel_explorePattern'), onAction: noop },
            ]}
          />
          <ProgressStreaksCard />
          <SmartCalendarCard />
          <LifestylePlanCard type="nutrition" />
          <MotivationCard />
        </CardStack>
      </CoachScaffold>
      {burst > 0 ? <ConfettiBurst key={burst} onDone={burstDone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { gap: 24 },
  side: { gap: 16 },
  log: { maxHeight: 192 },
  list: { gap: 8 },
  entry: { padding: 8, borderRadius: 8, borderWidth: 1, gap: 4 },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  shrink: { flexShrink: 1 },
});
