/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * `/health/education` (HEALTH.EDUCATION, `?tab=videos` HEALTH.EDUCATION_VIDEOS,
 * `?tab=podcasts` HEALTH.EDUCATION_PODCASTS), twin of the phone branch of
 * `src/pages/health/EducationResources.tsx:95-232`: the health
 * sub-navigation, the 📚 header, the Education Actions button and its popup
 * (`EducationMasterActionPopup`, every action closes it and opens
 * `/health/education`), and the Articles / Videos / Podcasts split bar
 * (`useUrlTab("tab", "articles")`). The web's literal header description and
 * video / podcast samples (EducationResources.tsx:108,167-172,199-204) come from
 * the `healthNative` catalog. Not ported: the utility row's
 * ExpandableSearchButton (no search handler, EducationResources.tsx:113) and
 * UniversalCalendarButton (the calendar lane's popup, :114), as on /memory.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { HealthIcon, useHealthPalette } from '../../ports/health-plans';
import { useI18n } from '../../i18n/I18nProvider';
import { HealthPanel, HealthScaffold, QuickActionsDialog, SplitBar, StandardHeader, UtilityRow, healthStyles, useUrlTab, type QuickAction } from './plans-services/components';

const TABS = ['articles', 'videos', 'podcasts'] as const;
type Tab = (typeof TABS)[number];

/**
 * EducationResources.tsx:134-141 (rating is a literal on the web). The web asks
 * for `screens.health.eduArticle_*`, `screens.health.eduCategory_*` and
 * `screens.health.eduReadTime`, which no catalog has — the shard keeps them
 * under `screens.ai.*` (src/i18n/<locale>/screens.json) — so the web shows the
 * raw key path; the native cards read the `screens.ai.*` keys that hold the text.
 */
const ARTICLES = [
  { id: 'vitanaIndex', categoryKey: 'screens.ai.eduCategory_healthMetrics', mins: '5', rating: '4.8' },
  { id: 'nutritionScience', categoryKey: 'screens.health.pillar_nutrition_title', mins: '8', rating: '4.9' },
  { id: 'sleepRecovery', categoryKey: 'screens.ai.eduCategory_sleepHealth', mins: '6', rating: '4.7' },
  { id: 'exercisePhysiology', categoryKey: 'screens.ai.eduCategory_fitness', mins: '10', rating: '4.6' },
  { id: 'mentalHealth', categoryKey: 'screens.ai.eduCategory_psychology', mins: '7', rating: '4.8' },
  { id: 'preventiveCare', categoryKey: 'screens.ai.eduCategory_prevention', mins: '12', rating: '4.9' },
] as const;

/** EducationResources.tsx:166-173. */
const VIDEOS = [
  { id: 'v1', duration: '15:30', views: '2.1K' },
  { id: 'v2', duration: '22:45', views: '5.8K' },
  { id: 'v3', duration: '18:20', views: '3.2K' },
  { id: 'v4', duration: '25:10', views: '7.4K' },
  { id: 'v5', duration: '20:15', views: '4.6K' },
  { id: 'v6', duration: '12:40', views: '1.9K' },
] as const;

/** EducationResources.tsx:198-205. */
const PODCASTS = [
  { id: 'p1', duration: '45:20', episode: 12 },
  { id: 'p2', duration: '38:15', episode: 8 },
  { id: 'p3', duration: '52:30', episode: 15 },
  { id: 'p4', duration: '41:45', episode: 22 },
  { id: 'p5', duration: '35:10', episode: 5 },
  { id: 'p6', duration: '48:25', episode: 18 },
] as const;

/** EducationMasterActionPopup.tsx:27-90 — every action navigates to /health/education. */
const ACTIONS: ReadonlyArray<{ id: string; icon: string }> = [
  { id: 'browseArticles', icon: 'BookOpen' },
  { id: 'watchVideos', icon: 'Video' },
  { id: 'listenPodcasts', icon: 'Headphones' },
  { id: 'searchContent', icon: 'Search' },
  { id: 'myBookmarks', icon: 'Bookmark' },
  { id: 'downloadOffline', icon: 'Download' },
  { id: 'healthCourses', icon: 'GraduationCap' },
];

function Chip({ label }: { label: string }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.muted }]}>
      <Text size="xs" muted>
        {label}
      </Text>
    </View>
  );
}

export function EducationResourcesScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const [tab, setTab] = useUrlTab<Tab>(TABS, 'articles');
  const [actionsOpen, setActionsOpen] = useState(false);

  const actions: QuickAction[] = ACTIONS.map((a) => ({
    id: a.id,
    icon: a.icon,
    title: t(`healthNative.educationActions.${a.id}.title`),
    description: t(`healthNative.educationActions.${a.id}.description`),
    path: '/health/education',
  }));

  return (
    <HealthScaffold activePath="/health/education" testID="screen-health-education">
      <StandardHeader emoji="📚" title={t('screens.health.educationScience')} description={t('healthNative.education.description')} />
      <UtilityRow>
        <Button size="sm" onPress={() => setActionsOpen(true)} testID="health-education-actions-open">
          {t('screens.health.educationActions')}
        </Button>
      </UtilityRow>
      <SplitBar
        testID="health-education-tab"
        value={tab}
        onChange={setTab}
        items={TABS.map((v) => ({ value: v, label: t(`screens.health.${v}`) }))}
      />
      {tab === 'articles' ? (
        <View style={healthStyles.list} testID="health-education-articles">
          {ARTICLES.map((a) => (
            <HealthPanel key={a.id} testID={`health-education-article-${a.id}`}>
              <View style={healthStyles.between}>
                <Chip label={t(a.categoryKey)} />
                <View style={healthStyles.row}>
                  <HealthIcon name="Star" size={12} color={palette.warning} />
                  <Text size="xs" muted>
                    {a.rating}
                  </Text>
                </View>
              </View>
              <Text size="lg" weight="600">
                {t(`screens.ai.eduArticle_${a.id}_title`)}
              </Text>
              <View style={healthStyles.row}>
                <HealthIcon name="Clock" size={16} color={colors.mutedForeground} />
                <Text size="sm" muted>
                  {t('screens.health.readtimeRead', { readTime: t('screens.ai.eduReadTime', { mins: a.mins }) })}
                </Text>
              </View>
            </HealthPanel>
          ))}
        </View>
      ) : tab === 'videos' ? (
        <View style={healthStyles.list} testID="health-education-videos">
          {VIDEOS.map((v) => (
            <HealthPanel key={v.id} testID={`health-education-video-${v.id}`}>
              <View style={healthStyles.between}>
                <Chip label={t(`healthNative.education.videos.${v.id}.category`)} />
                <View style={healthStyles.row}>
                  <HealthIcon name="Play" size={16} color={palette.success} />
                  <Text size="xs" muted>
                    {t('screens.health.viewsViews', { views: v.views })}
                  </Text>
                </View>
              </View>
              <Text size="lg" weight="600">
                {t(`healthNative.education.videos.${v.id}.title`)}
              </Text>
              <View style={healthStyles.row}>
                <HealthIcon name="Video" size={16} color={colors.mutedForeground} />
                <Text size="sm" muted>
                  {v.duration}
                </Text>
              </View>
            </HealthPanel>
          ))}
        </View>
      ) : (
        <View style={healthStyles.list} testID="health-education-podcasts">
          {PODCASTS.map((p) => (
            <HealthPanel key={p.id} testID={`health-education-podcast-${p.id}`}>
              <View style={healthStyles.between}>
                <Chip label={t(`healthNative.education.podcasts.${p.id}.series`)} />
                <Text size="xs" muted>
                  {t('healthNative.education.episode', { episode: p.episode })}
                </Text>
              </View>
              <Text size="lg" weight="600">
                {t(`healthNative.education.podcasts.${p.id}.title`)}
              </Text>
              <View style={healthStyles.row}>
                <HealthIcon name="Headphones" size={16} color={colors.mutedForeground} />
                <Text size="sm" muted>
                  {p.duration}
                </Text>
              </View>
            </HealthPanel>
          ))}
        </View>
      )}
      <QuickActionsDialog
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={t('screens.common.educationActions')}
        actions={actions}
        testID="health-education-actions"
      />
    </HealthScaffold>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
});
