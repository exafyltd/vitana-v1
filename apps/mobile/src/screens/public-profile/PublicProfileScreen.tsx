/**
 * VTID-05430 (Native Wave 2, public-profile lane) — native twin of the web
 * `src/pages/PublicProfilePage.tsx` (`/u/:identifier`, `src/App.tsx:1493`, no
 * AuthGuard): PROFILE.PUBLIC and PROFILE.WITH_MATCH
 * (`/u/:identifier?match_intent=:intent_id`, the same route file — the ledger's
 * `shapeOf` drops the query).
 *
 * The route lives in the `(public)` group (plan decision 1b), outside the
 * `(app)` AuthGate that would send a signed-out visitor to `/maxina`. The web
 * page renders inside `AppLayout` for every visitor, so the screen makes the
 * split `(app)/_layout.tsx` makes through AuthGate itself: `MobileAppShell`
 * with a session, `PublicShell` without one.
 *
 * States, as on web: loading (`screens.publicprofilepage.loadingProfile`);
 * not found / load error ("User Not Found" + Return to Home → `/`); a legacy
 * handle alias replaces the route with `/u/<canonical>`; found → the landing
 * (`PublicProfileLanding`) for a signed-out visitor or a shared
 * `?utm_source=profile` link (web `isSharedLink`), else the member layout
 * (`PublicProfileMemberView`).
 *
 * `?match_intent=` — the web page and its components read no `match_intent`
 * param today (grep of `src/`: only the screens.json route carries it), so the
 * WITH_MATCH variant renders the same profile; inventing a highlight would be
 * a redesign (requirements R1.1). React 19: typed with `ReactElement`.
 */
import { useEffect, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DelayedLoader, PressableRow, Spinner, Text, useUITheme } from '../../ports/ui';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { MobileAppShell } from '../../shell/components/MobileAppShell';
import { PublicShell } from '../../shell/components/PublicShell';
import { usePublicProfile } from './data/profile';
import { PublicProfileLanding } from './PublicProfileLanding';
import { PublicProfileMemberView } from './PublicProfileMemberView';

type Params = { identifier?: string; utm_source?: string; match_intent?: string };

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

function NotFoundState({ errorKey }: { errorKey: string | null }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View testID="public-profile-not-found" style={[styles.center, { backgroundColor: colors.background }]}>
      <Text size="2xl" weight="700" accessibilityRole="header" style={styles.centerText}>
        {t('screens.publicprofilepage.userNotFound')}
      </Text>
      <Text muted testID={errorKey ? 'public-profile-error' : undefined} style={styles.centerText}>
        {t(errorKey ?? 'publicProfileNative.notFound.body')}
      </Text>
      <PressableRow testID="public-profile-return-home" accessibilityRole="link" onPress={() => router.navigate('/' as never)} style={styles.link}>
        <Text color={colors.primary}>{t('screens.publicprofilepage.returnHome')}</Text>
      </PressableRow>
    </View>
  );
}

function LoadingState(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View testID="public-profile-loading" style={[styles.center, { backgroundColor: colors.background }]}>
      <Spinner accessibilityLabel={t('screens.publicprofilepage.loadingProfile')} />
      <Text muted>{t('screens.publicprofilepage.loadingProfile')}</Text>
    </View>
  );
}

function ProfileBody({ identifier, isSharedLink }: { identifier: string | undefined; isSharedLink: boolean }): ReactElement {
  const query = usePublicProfile(identifier);
  const result = query.data;
  const canonical = result?.status === 'redirect' ? result.canonical : null;

  useEffect(() => {
    if (canonical) navigateToWebPath(`/u/${canonical}`, { replace: true });
  }, [canonical]);

  if (!identifier) return <NotFoundState errorKey="publicProfileNative.notFound.noIdentifier" />;
  if (query.isLoading || !result || result.status === 'redirect') return <LoadingState />;
  if (result.status === 'error') {
    return <NotFoundState errorKey={result.reason === 'load-failed' ? 'publicProfileNative.notFound.loadFailed' : 'publicProfileNative.notFound.unexpected'} />;
  }
  if (result.status === 'not-found') return <NotFoundState errorKey={null} />;
  if (isSharedLink) return <PublicProfileLanding profile={result.profile} milestones={result.milestones} galleryPhotos={result.galleryPhotos} />;
  return <PublicProfileMemberView profile={result.profile} milestones={result.milestones} galleryPhotos={result.galleryPhotos} />;
}

export function PublicProfileScreen(): ReactElement {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const params = useLocalSearchParams<Params>();
  const identifier = first(params.identifier);
  const isSharedLink = first(params.utm_source) === 'profile' || !user;

  // Same wait AuthGate makes before it picks a shell.
  if (loading) return <DelayedLoader accessibilityLabel={t('common.loading')} />;
  const Shell: (p: { children: ReactNode }) => ReactNode = user ? MobileAppShell : PublicShell;
  return (
    <Shell>
      <ProfileBody identifier={identifier} isSharedLink={isSharedLink} />
    </Shell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  centerText: { textAlign: 'center' },
  link: { justifyContent: 'center' },
});
