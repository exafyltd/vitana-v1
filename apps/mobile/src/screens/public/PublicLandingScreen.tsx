/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) —
 * `PUBLIC.LANDING /`: native twin of the signed-out storefront of
 * src/pages/Index.tsx (the ShareEntry fallback, App.tsx:818) on the mobile
 * branch: the VITANA wordmark, the two intro lines, the five portal cards
 * (Maxina → `/_intro/maxina` keeping the query, AlKalma → `/alkalma`, Exafy
 * Admin → `/exafy-admin`, Vitana DEV → the gateway Command Hub in the system
 * browser or the web's "not configured" error toast, Commerce Portal →
 * `/commerce-login`) and the footer line.
 *
 * Like the web, a resolving session paints a loader, never the grid, and a
 * signed-in member is sent on (useSmartRouting: `/` → `/home`). ShareEntry's
 * `?share=` and host-based redirects are link-router concerns on native
 * (resolve-link.ts), not this screen's.
 *
 * Not mounted yet: a cold `/` is N3's landing redirect `app/index.tsx`
 * (native_only `/`), outside this lane's paths, so there is no route file and
 * the PUBLIC.LANDING row stays not_started. A follow-up lane (plan amendment)
 * mounts this screen at `/` for signed-out users.
 */
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DelayedLoader, PressableRow, Text, notifyError, useUITheme } from '../../ports/ui';
import { PublicIcon, usePublicPalette, withAlpha, type CategoryKey } from '../../ports/public';
import { config } from '../../ports/env';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';

/** web getCommandHubUrl (devHub.config.ts): `<gateway>/command-hub/`, or null when no gateway is configured. */
export function commandHubUrl(gatewayUrl: string | null | undefined): string | null {
  if (!gatewayUrl) return null;
  return `${gatewayUrl.replace(/\/+$/, '')}/command-hub/`;
}

/** `?a=1&b=2` from the route's search params (the web forwards `window.location.search`). */
export function queryOf(params: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') q.append(k, v);
    else if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

type Portal = {
  id: string;
  icon: string;
  /** null = the neutral muted-foreground glyph (Exafy Admin). */
  category: CategoryKey | null;
  title: string;
  description: string;
  body: string;
  external?: boolean;
};

const PORTALS: readonly Portal[] = [
  {
    id: 'maxina',
    icon: 'Heart',
    category: 4,
    title: 'publicLegalNative.brandMaxina',
    description: 'screens.index.comprehensiveHealthWellnessPlatform',
    body: 'screens.index.completeHealthcareSolutionsWithPatientprofessional',
  },
  {
    id: 'alkalma',
    icon: 'BookOpen',
    category: 3,
    title: 'screens.index.alkalma',
    description: 'screens.index.culturallyawareHealthSolutions',
    body: 'screens.index.healthWellnessServicesDesignedWithCultural',
  },
  {
    id: 'exafy-admin',
    icon: 'Shield',
    category: null,
    title: 'screens.index.exafyAdmin',
    description: 'screens.index.systemAdministrationPortal',
    body: 'screens.index.secureAccessForExafyAdministratorsManage',
  },
  {
    id: 'dev',
    icon: 'Terminal',
    category: 7,
    title: 'screens.index.vitanaDev',
    description: 'screens.index.developerCommandHub',
    body: 'screens.index.operateVitanaPlatformObserveEventsIssue',
    external: true,
  },
  {
    id: 'commerce',
    icon: 'ShoppingBag',
    category: 5,
    title: 'screens.index.commercePortal',
    description: 'screens.index.merchantSelfServiceMarketplace',
    body: 'screens.index.connectYourBusinessToDiscoverYourself',
  },
];

export const PORTAL_IDS: readonly string[] = PORTALS.map((p) => p.id);

export function PublicLandingScreen({ gatewayUrl = config.gatewayUrl }: { gatewayUrl?: string | null }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = usePublicPalette();
  const { user, loading } = useAuth();
  const params = useLocalSearchParams<Record<string, string>>();

  if (loading) return <DelayedLoader accessibilityLabel={t('common.loading')} />;
  if (user) return <Redirect href={'/home' as never} />;

  const open = (id: string) => {
    switch (id) {
      case 'maxina':
        // Always show the intro first (members can skip it), keeping the query.
        router.navigate(`/_intro/maxina${queryOf(params)}` as never);
        return;
      case 'alkalma':
        navigateToWebPath('/alkalma');
        return;
      case 'exafy-admin':
        navigateToWebPath('/exafy-admin');
        return;
      case 'commerce':
        navigateToWebPath('/commerce-login');
        return;
      case 'dev': {
        const url = commandHubUrl(gatewayUrl);
        if (!url) {
          notifyError('toasts.index.vitanaDevGatewayUrlNotConfigured');
          return;
        }
        void Linking.openURL(url);
        return;
      }
      default:
    }
  };

  return (
    <ScrollView testID="public-landing" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.root}>
      <Text weight="700" accessibilityRole="header" style={styles.wordmark}>
        {t('publicLegalNative.brandVitana')}
      </Text>
      <Text size="xl" muted style={styles.center}>
        {t('screens.index.digitalSolutionsForYourWellnessJourney')}
      </Text>
      <Text size="lg" muted style={[styles.center, styles.intro]}>
        {t('screens.index.chooseYourHealthPlatformExperienceInnovation')}
      </Text>

      <View style={styles.grid}>
        {PORTALS.map((p) => {
          const tint = p.category ? palette.category[p.category] : colors.mutedForeground;
          return (
            <PressableRow key={p.id} testID={`landing-portal-${p.id}`} accessibilityRole="link" accessibilityLabel={t(p.title)} onPress={() => open(p.id)} style={styles.cardPress}>
              <Card style={[styles.card, p.category && p.id !== 'maxina' && p.id !== 'alkalma' ? { borderColor: withAlpha(tint, 0.3), backgroundColor: withAlpha(tint, 0.05) } : null]}>
                <CardHeader style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <PublicIcon name={p.icon} size={48} color={tint} />
                  </View>
                  <View style={styles.titleRow}>
                    <CardTitle size="xl" style={styles.center} color={p.id === 'dev' || p.id === 'commerce' ? tint : undefined}>
                      {t(p.title)}
                    </CardTitle>
                    {p.external ? <PublicIcon name="ExternalLink" size={16} color={withAlpha(tint, 0.5)} /> : null}
                  </View>
                  <CardDescription style={styles.center}>{t(p.description)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Text size="sm" muted style={styles.center}>
                    {t(p.body)}
                  </Text>
                </CardContent>
              </Card>
            </PressableRow>
          );
        })}
      </View>

      <View style={[styles.footer, { borderColor: withAlpha(colors.border, 0.5) }]}>
        <Text size="sm" muted style={styles.center}>
          {t('screens.index.vitanaComprehensiveDigitalHealthPlatformOffering')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  // text-6xl: 2.5 × the token scale's 2xl (24).
  wordmark: { fontSize: 60, lineHeight: 64, textAlign: 'center', marginBottom: 8 },
  center: { textAlign: 'center' },
  intro: { marginBottom: 24 },
  grid: { gap: 16 },
  cardPress: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  card: { width: '100%' },
  cardHeader: { alignItems: 'center' },
  iconWrap: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footer: { marginTop: 32, paddingTop: 24, borderTopWidth: 1 },
});
