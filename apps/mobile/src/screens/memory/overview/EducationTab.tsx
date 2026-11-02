/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the overview's
 * "Education" pane, native twin of the web `MemoryEducationTab.tsx`: six
 * static articles (category, impact, title, text, related factors) and the
 * "personalized insights coming soon" card. The web hardcodes the article
 * text in English; here it comes from `memoryNative.education.*` (DE first).
 */
import { StyleSheet, View } from 'react-native';
import { Badge, Text, useUITheme } from '../../../ports/ui';
import { MemoryIcon } from '../../../ports/memory';
import { MemoryCard } from '../components';
import { useMemoryText } from '../text';

const ARTICLES: ReadonlyArray<{ id: string; icon: string; impact: 'high' | 'medium' }> = [
  { id: 'sleep', icon: 'Brain', impact: 'high' },
  { id: 'nutrition', icon: 'Apple', impact: 'high' },
  { id: 'exercise', icon: 'Zap', impact: 'medium' },
  { id: 'stress', icon: 'Heart', impact: 'high' },
  { id: 'hydration', icon: 'TrendingUp', impact: 'medium' },
  { id: 'lifestyle', icon: 'Lightbulb', impact: 'high' },
];

export function MemoryEducationTab() {
  const { t } = useMemoryText();
  const { colors } = useUITheme();
  return (
    <View style={styles.list} testID="memory-education-tab">
      <Text muted>{t('screens.memory.learnHowLifestyleFactorsInfluenceYour')}</Text>
      {ARTICLES.map((a) => {
        const k = `memoryNative.education.items.${a.id}`;
        return (
          <MemoryCard key={a.id} testID={`memory-education-${a.id}`}>
            <View style={styles.head}>
              <View style={[styles.icon, { backgroundColor: colors.muted }]}>
                <MemoryIcon name={a.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.fill}>
                <View style={styles.badges}>
                  <Badge variant="secondary">{t(`${k}.category`)}</Badge>
                  <Badge variant={a.impact === 'high' ? 'default' : 'outline'}>{t(`memoryNative.education.impact.${a.impact}`)}</Badge>
                </View>
                <Text weight="600" style={styles.title}>
                  {t(`${k}.title`)}
                </Text>
              </View>
            </View>
            <Text muted>{t(`${k}.content`)}</Text>
            <View style={[styles.factors, { borderTopColor: colors.border }]}>
              <Text variant="label" muted>
                {t('screens.memory.relatedFactors')}
              </Text>
              <View style={styles.badges}>
                {[1, 2, 3].map((n) => (
                  <Badge key={n} variant="outline">
                    {t(`${k}.factor${n}`)}
                  </Badge>
                ))}
              </View>
            </View>
          </MemoryCard>
        );
      })}
      <MemoryCard testID="memory-education-coming-soon">
        <View style={styles.soon}>
          <MemoryIcon name="Lightbulb" size={20} color={colors.primary} />
          <Text weight="600">{t('screens.memory.personalizedInsightsComingSoon')}</Text>
        </View>
        <Text muted>{t('screens.memory.asYouTrackMoreMemoriesData').replace(/\s+/g, ' ')}</Text>
      </MemoryCard>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { marginTop: 8 },
  factors: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
