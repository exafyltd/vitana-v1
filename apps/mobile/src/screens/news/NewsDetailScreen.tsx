/**
 * VTID-05298 (Native Wave 2, news lane) — native twin of the web
 * `src/pages/NewsArticleDetail.tsx` (the non-Spotlight mobile-web branch).
 *
 * A full-screen reader on the N3 shell: a sticky top bar with a back control
 * and the source, a 16:9 hero image (primary + fallback swap), category ·
 * timestamp, title, summary, the source row, and the article's actions
 * (greet a new member / view profile for an internal link, or read on /
 * open in browser for an external one) — the same actions, order and catalog
 * keys as the web screen.
 *
 * The web reader takes the article from router state (`location.state`) and
 * redirects to `/home` when it is missing. Native passes the article as a
 * serialized `article` search param (the feed card and the shell deep-link
 * resolver own that), and renders a not-found state when it is absent or
 * unparseable — a cold deep link cannot carry the article, so there is
 * nothing to show. React 19: typed with `ReactElement`.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, PressableRow, Text, useUITheme } from '../../ports/ui';
import { getNewsImage, getArticlePillar } from '../../ports/news';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionButton } from './ActionButton';
import type { NewsArticle } from './types';

/** Parses the serialized `article` search param; null when absent or invalid. */
export function parseArticleParam(raw: string | string[] | undefined): NewsArticle | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<NewsArticle>;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.title === 'string') return parsed as NewsArticle;
    return null;
  } catch {
    return null;
  }
}

function HeroImage({ primaryUrl, fallbackUrl }: { primaryUrl: string; fallbackUrl: string }): ReactElement {
  const { colors } = useUITheme();
  const [src, setSrc] = useState(primaryUrl);
  const [fellBack, setFellBack] = useState(false);
  useEffect(() => {
    setSrc(primaryUrl);
    setFellBack(false);
  }, [primaryUrl]);
  return (
    <View style={[styles.hero, { backgroundColor: colors.muted }]}>
      <Image
        testID="news-detail-hero"
        source={{ uri: src }}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        accessibilityIgnoresInvertColors
        onError={() => {
          if (!fellBack && fallbackUrl !== src) {
            setFellBack(true);
            setSrc(fallbackUrl);
          }
        }}
      />
    </View>
  );
}

export function NewsDetailScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ id?: string; article?: string }>();
  const article = useMemo(() => parseArticleParam(params.article), [params.article]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else navigateToWebPath('/home', { replace: true });
  };

  if (!article) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="news-detail-not-found">
        <Text variant="title" accessibilityRole="header">
          {t('newsNative.article.unavailableTitle')}
        </Text>
        <Text muted style={styles.centerBody}>
          {t('newsNative.article.unavailableBody')}
        </Text>
        <ActionButton testID="news-detail-not-found-home" label={t('newsNative.article.backToFeed')} onPress={back} />
      </View>
    );
  }

  const fallbackUrl = getNewsImage(article.tags, article.id, article.title, article.summary);
  const primaryUrl = article.image_url || fallbackUrl;
  const pillar = getArticlePillar(article.tags, article.title, article.summary);
  const categoryLabel = article.source === 'community' ? 'COMMUNITY' : (pillar || 'NUTRITION').toUpperCase();
  const avatarLetter = (article.source_name || '•').charAt(0).toUpperCase();
  const isInternalLink = !!article.link && article.link.startsWith('/');
  const openExternal = () => {
    if (article.link) void Linking.openURL(article.link);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="news-detail">
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <PressableRow
          testID="news-detail-back"
          accessibilityRole="button"
          accessibilityLabel={t('newsCard.detail.back')}
          onPress={back}
          style={[styles.backButton, { backgroundColor: colors.muted }]}
        >
          <Text variant="label" weight="600">
            {t('newsCard.detail.back')}
          </Text>
        </PressableRow>
        <View style={styles.topBarSource}>
          <Avatar fallback={avatarLetter} size={24} />
          <Text variant="body" numberOfLines={1} style={styles.topBarName}>
            {article.source_name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} testID="news-detail-scroll">
        <HeroImage primaryUrl={primaryUrl} fallbackUrl={fallbackUrl} />

        <View style={styles.article}>
          <View style={styles.metaRow}>
            <Text variant="label" style={[styles.category, { color: colors.primary }]}>
              {categoryLabel}
            </Text>
          </View>
          <Text weight="700" style={styles.title}>
            {article.title}
          </Text>
          {article.summary ? (
            <Text variant="body" muted style={styles.summary}>
              {article.summary}
            </Text>
          ) : null}
          <View style={styles.sourceRow}>
            <Avatar fallback={avatarLetter} size={28} />
            <Text variant="body" muted numberOfLines={1} style={styles.sourceName}>
              {article.source_name}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {article.member_user_id ? (
            <>
              <ActionButton
                testID="news-detail-say-hello"
                label={t('newsCard.member.sayHello')}
                onPress={() => navigateToWebPath(`/inbox/u/${article.member_user_id}`)}
              />
              <ActionButton
                testID="news-detail-view-profile"
                variant="outline"
                label={t('newsCard.member.viewProfile')}
                onPress={() => navigateToWebPath(`/u/${article.member_user_id}`)}
              />
            </>
          ) : null}

          {!article.member_user_id && isInternalLink ? (
            <ActionButton
              testID="news-detail-open-internal"
              label={t('newsCard.member.viewProfile')}
              onPress={() => navigateToWebPath(article.link as string)}
            />
          ) : null}

          {article.link && !isInternalLink ? (
            <>
              <ActionButton
                testID="news-detail-read-on"
                label={`${t('newsCard.detail.readOn')} ${article.source_name ?? ''}`.trim()}
                onPress={openExternal}
              />
              <ActionButton testID="news-detail-open-browser" variant="outline" label={t('newsCard.detail.openInBrowser')} onPress={openExternal} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  centerBody: { textAlign: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  backButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  topBarSource: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  topBarName: { flexShrink: 1, opacity: 0.8 },
  body: { paddingBottom: 32 },
  hero: { width: '100%', aspectRatio: 16 / 9 },
  article: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  category: { textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 20, lineHeight: 26 },
  summary: { lineHeight: 22 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  sourceName: { flexShrink: 1, opacity: 0.8 },
  actions: { paddingHorizontal: 16, paddingTop: 24, gap: 12 },
});
