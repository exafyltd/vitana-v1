/**
 * VTID-05510 (moved to the shared shell by VTID-05653) — twin of src/components/memory/LifeCompassPopup.tsx, the global
 * Life Compass dialog the utility rail's Life Compass pill opens: title +
 * description, the "Current Compass" card (the stored goal — re-translated
 * when it is a suggested goal's canonical title — with alignment and
 * confidence), the suggested goals minus the active one (a tap saves it and
 * closes), and the custom goal (text + category chip + "Set custom goal").
 * Suggested goals persist their canonical English title, as on the web.
 *
 * The web mounts this popup once, app-wide (LifeCompassPopupProvider,
 * `vitana:open-life-compass`). Natively `OverlayHost` is that host (VTID-05653):
 * every bar emits the event and the host opens this one popup. Only the
 * Discover rail still opens it itself, and only when no host listens.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { alpha, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DiscoverIcon, Textarea, toneForGradient, useTonePalette } from '../../ports/utility';
import { useI18n } from '../../i18n/I18nProvider';
import { useLifeCompass, type LifeCompass } from './life-compass';

/** LifeCompassPopup.tsx SUGGESTED_GOALS (canonical titles verbatim: they are the stored value). */
export const SUGGESTED_GOALS = [
  { category: 'wealth', canonicalTitle: 'Build Financial Freedom', icon: 'DollarSign', gradient: 'from-yellow-500/20 to-amber-500/20' },
  { category: 'relationship', canonicalTitle: 'Find Life Partner', icon: 'Heart', gradient: 'from-pink-500/20 to-rose-500/20' },
  { category: 'health', canonicalTitle: 'Transform Health', icon: 'TrendingUp', gradient: 'from-green-500/20 to-emerald-500/20' },
  { category: 'career', canonicalTitle: 'Advance Career', icon: 'Briefcase', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { category: 'learning', canonicalTitle: 'Master New Skills', icon: 'GraduationCap', gradient: 'from-purple-500/20 to-indigo-500/20' },
  { category: 'spiritual', canonicalTitle: 'Spiritual Life', icon: 'Sparkles', gradient: 'from-violet-500/20 to-fuchsia-500/20' },
  { category: 'longevity', canonicalTitle: 'Improve quality of life and extend lifespan', icon: 'Infinity', gradient: 'from-sky-500/20 to-teal-500/20' },
] as const;

function isActiveGoal(goal: { category: string }, compass: LifeCompass | null): boolean {
  if (!compass) return false;
  const norm = (s: string) => s.trim().toLowerCase();
  return norm(compass.category) === norm(goal.category);
}

export function LifeCompassPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();
  const { compass, updateCompass, isUpdating } = useLifeCompass(open);
  const [customGoal, setCustomGoal] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const visibleGoals = useMemo(() => SUGGESTED_GOALS.filter((g) => !isActiveGoal(g, compass)), [compass]);

  const displayed = (() => {
    if (!compass) return '';
    const match = SUGGESTED_GOALS.find((g) => g.category === compass.category && g.canonicalTitle === compass.primary_goal);
    return match ? t(`lifeCompass.goals.${match.category}.title`) : compass.primary_goal;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="life-compass-popup">
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <DialogHeader>
            <View style={styles.titleRow}>
              <DiscoverIcon name="Target" size={20} color={colors.primary} />
              <DialogTitle>{t('lifeCompass.title')}</DialogTitle>
            </View>
            <DialogDescription>{t('lifeCompass.description')}</DialogDescription>
          </DialogHeader>
          {compass ? (
            <View style={[styles.current, { backgroundColor: alpha(colors.primary, 0.1), borderColor: alpha(colors.primary, 0.2) }]} testID="life-compass-current">
              <Text size="xs" weight="500" muted>
                {t('lifeCompass.currentCompass')}
              </Text>
              <Text weight="600">{displayed}</Text>
              <View style={styles.metrics}>
                <Text size="xs" muted>
                  {t('lifeCompass.alignment', { value: compass.alignment_score })}
                </Text>
                <Text size="xs" muted>
                  {t('lifeCompass.confidence', { value: compass.confidence_score })}
                </Text>
              </View>
            </View>
          ) : null}
          <Text size="xs" weight="600" muted style={styles.upper}>
            {t('lifeCompass.suggestedGoals')}
          </Text>
          {visibleGoals.map((goal) => (
            <Pressable
              key={goal.category}
              testID={`life-compass-goal-${goal.category}`}
              accessibilityRole="button"
              disabled={isUpdating}
              onPress={() => {
                updateCompass({ primary_goal: goal.canonicalTitle, category: goal.category });
                onOpenChange(false);
              }}
              style={[styles.goal, { borderColor: colors.border, backgroundColor: alpha(tone(toneForGradient(goal.gradient)), 0.2) }, isUpdating ? { opacity: 0.5 } : null]}
            >
              <DiscoverIcon name={goal.icon} size={20} color={colors.foreground} />
              <View style={styles.flex}>
                <Text size="sm" weight="600">
                  {t(`lifeCompass.goals.${goal.category}.title`)}
                </Text>
                <Text size="xs" muted>
                  {t(`lifeCompass.goals.${goal.category}.description`)}
                </Text>
              </View>
            </Pressable>
          ))}
          <View style={[styles.custom, { borderTopColor: colors.border }]}>
            <Text size="xs" weight="600" muted style={styles.upper}>
              {t('lifeCompass.customGoal')}
            </Text>
            <Textarea testID="life-compass-custom" value={customGoal} onChangeText={setCustomGoal} placeholder={t('lifeCompass.customGoalPlaceholder')} accessibilityLabel={t('lifeCompass.customGoal')} />
            <View style={styles.chips}>
              {visibleGoals.map((goal) => {
                const on = selectedCategory === goal.category;
                return (
                  <Pressable
                    key={goal.category}
                    testID={`life-compass-category-${goal.category}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setSelectedCategory(goal.category)}
                    style={[styles.chip, on ? { borderColor: colors.primary, backgroundColor: alpha(colors.primary, 0.1) } : { borderColor: colors.border }]}
                  >
                    <Text size="xs">{t(`lifeCompass.categoryLabels.${goal.category}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button
              testID="life-compass-set-custom"
              disabled={!customGoal.trim() || !selectedCategory || isUpdating}
              onPress={() => {
                if (!customGoal.trim() || !selectedCategory) return;
                updateCompass({ primary_goal: customGoal.trim(), category: selectedCategory });
                setCustomGoal('');
                onOpenChange(false);
              }}
            >
              {t('lifeCompass.setCustomGoal')}
            </Button>
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 560 },
  body: { gap: 12, paddingEnd: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  current: { borderRadius: 8, borderWidth: 1, padding: 12, gap: 4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, marginTop: 4 },
  upper: { textTransform: 'uppercase', letterSpacing: 1 },
  goal: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 2, borderRadius: 8, padding: 12 },
  custom: { borderTopWidth: 1, paddingTop: 16, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
});
