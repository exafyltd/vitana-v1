/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the three
 * email-confirmed screens, phone branch (no Spotlight frame: a centred card):
 *
 *   vitana   `/auth/confirmed`    src/pages/auth/EmailConfirmed.tsx
 *   maxina   `/maxina/confirmed`  src/pages/portals/MaxinaConfirmed.tsx
 *   alkalma  `/alkalma/confirmed` src/pages/portals/AlkalmaConfirmed.tsx
 *
 * The confirmation link resolves through `resolve-link` (→ `auth`) and is
 * delivered by `auth-port`; link-bridge.ts turns it into the session and opens
 * this screen (with `?error=` when it failed). The screen reads only the route
 * params and the auth session (`confirmationState`), never the link.
 *
 * States: loading (auth bootstrapping) → error card (cancelled / expired /
 * other / not signed in) with the way back, or the confirmed card with the
 * Continue CTA and the web's auto-redirect (3 s; Maxina 5 s so the welcome
 * discount can be read) to the role-based landing (`roleRedirectUrl`). The
 * two portal variants switch into their tenant on mount like the web. The
 * Alkalma page's Arabic success copy (hardcoded Arabic on the web, whatever the
 * UI language) comes from `authPortalsNative.alkalmaConfirmed.*`, read in `ar`
 * so every member sees the same Arabic page; its error state follows the UI
 * language like the web's `t()` calls.
 */
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { DelayedLoader, Text, useUITheme } from '../../ports/ui';
import { AuthIcon, useAuthPalette, withAlpha } from '../../ports/auth';
import { useI18n } from '../../i18n/I18nProvider';
import { translate } from '../../i18n';
import { useAuth } from '../../auth/AuthProvider';
import { useTenant } from '../../identity/TenantProvider';
import { useRole } from '../../identity/useRole';
import { confirmationState, fetchWelcomeDiscount, roleRedirectUrl } from '../../auth/post-confirm';
import { Button } from './form';

export type ConfirmedVariant = 'vitana' | 'maxina' | 'alkalma';

/** EmailConfirmed / AlkalmaConfirmed 3 s; MaxinaConfirmed 5 s ("so user can see discount code"). */
export const CONFIRMED_REDIRECT_MS: Record<ConfirmedVariant, number> = { vitana: 3000, maxina: 5000, alkalma: 3000 };

const COPY: Record<ConfirmedVariant, { errorTitle: string; back: string; backHref: string; title: string; body: string; accent?: string; redirecting: string; cta: string; footer: string; icon: string }> = {
  vitana: {
    errorTitle: 'screens.auth.confirmationError',
    back: 'screens.auth.backSign',
    backHref: '/',
    title: 'screens.auth.thankYouForJoiningVitana',
    body: 'screens.auth.yourEmailHasSuccessfullyConfirmed',
    redirecting: 'screens.auth.youLlRedirectedYourDashboardFew',
    cta: 'screens.auth.continueDashboard',
    footer: 'screens.auth.welcomeYourPersonalizedHealthIntelligencePlatform',
    icon: 'CheckCircle',
  },
  maxina: {
    errorTitle: 'screens.portals.confirmationError',
    back: 'screens.portals.backMaxinaPortal',
    backHref: '/maxina',
    title: 'screens.portals.welcomeMaxina',
    body: 'screens.portals.yourEmailHasSuccessfullyConfirmed',
    accent: 'screens.portals.yourWomenSHealthJourneyStarts',
    redirecting: 'screens.portals.youLlRedirectedYourDashboardFew',
    cta: 'screens.portals.continueDashboard',
    footer: 'screens.portals.empoweringWomenThroughPersonalizedHealthInsights',
    icon: 'Heart',
  },
  alkalma: {
    errorTitle: 'screens.portals.confirmationError',
    back: 'screens.portals.backAlkalmaPortal',
    backHref: '/alkalma',
    title: 'authPortalsNative.alkalmaConfirmed.title',
    body: 'authPortalsNative.alkalmaConfirmed.body',
    accent: 'authPortalsNative.alkalmaConfirmed.journey',
    redirecting: 'authPortalsNative.alkalmaConfirmed.redirecting',
    cta: 'authPortalsNative.alkalmaConfirmed.continue',
    footer: 'authPortalsNative.alkalmaConfirmed.footer',
    icon: 'Sparkles',
  },
};

export function ConfirmedScreen({ variant }: { variant: ConfirmedVariant }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useAuthPalette();
  const params = useLocalSearchParams<{ error?: string; error_description?: string }>();
  const { user, loading } = useAuth();
  const { tenant, registry, setTenantBySlug } = useTenant();
  const { dbRole } = useRole();
  const copy = COPY[variant];
  const state = confirmationState({ error: params.error, error_description: params.error_description }, !!user);
  /** Success-card copy: the Alkalma page is Arabic on the web in every UI language. */
  const tc = (key: string) => (variant === 'alkalma' ? translate('ar', key) : t(key));
  const tint = variant === 'maxina' ? palette.ruby : variant === 'alkalma' ? palette.category2 : palette.success;

  const discount = useQuery({
    queryKey: ['welcome-discount', 'maxina', user?.id],
    enabled: variant === 'maxina' && !!user,
    queryFn: () => fetchWelcomeDiscount('maxina', user!.id),
  });

  const target = roleRedirectUrl(dbRole, tenant?.slug, registry);

  useEffect(() => {
    if (variant !== 'vitana') void setTenantBySlug(variant).catch(() => undefined);
  }, [variant, setTenantBySlug]);

  const confirmed = !loading && state.kind === 'confirmed';
  useEffect(() => {
    if (!confirmed) return undefined;
    const timer = setTimeout(() => router.replace(target as never), CONFIRMED_REDIRECT_MS[variant]);
    return () => clearTimeout(timer);
  }, [confirmed, target, variant]);

  if (loading) return <DelayedLoader accessibilityLabel={t('common.loading')} />;

  if (state.kind === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.root} testID={`confirmed-error-${variant}`}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text variant="title" accessibilityRole="header" style={[styles.center, { color: colors.destructive }]}>
            {t(copy.errorTitle)}
          </Text>
          <Text muted style={styles.center} testID="confirmed-error-message">
            {t(state.messageKey)}
          </Text>
          <Button testID="confirmed-back" variant="outline" label={t(copy.back)} onPress={() => router.replace(copy.backHref as never)} />
        </View>
      </ScrollView>
    );
  }

  const code = variant === 'maxina' && !discount.isLoading ? discount.data : null;

  return (
    <ScrollView contentContainerStyle={styles.root} testID={`confirmed-${variant}`}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.badge, { backgroundColor: variant === 'vitana' ? palette.successSubtle : withAlpha(tint, 0.12) }]}>
          <AuthIcon name={copy.icon} size={32} color={tint} />
        </View>
        <Text variant="title" accessibilityRole="header" style={[styles.center, styles.title, { color: tint }]}>
          {tc(copy.title)}
        </Text>
        <Text muted style={styles.center}>
          {tc(copy.body)}
        </Text>
        {copy.accent ? <Text style={[styles.center, styles.accent, { color: tint }]}>{tc(copy.accent)}</Text> : null}
        {variant === 'vitana' || variant === 'alkalma' ? (
          <Text variant="caption" muted style={styles.center}>
            {tc(copy.redirecting)}
          </Text>
        ) : null}

        {code ? (
          <View style={[styles.discount, { borderColor: withAlpha(palette.ruby, 0.3), backgroundColor: withAlpha(palette.ruby, 0.08) }]} testID="confirmed-discount">
            <View style={styles.discountHead}>
              <AuthIcon name="Gift" size={20} color={palette.ruby} />
              <Text style={{ color: palette.ruby, fontWeight: '600' }}>{t('discount.welcomeTitle')}</Text>
            </View>
            <Text style={[styles.code, { color: palette.ruby }]} testID="confirmed-discount-code">
              {code.code}
            </Text>
            <Text muted style={styles.center}>
              {t('discount.welcomeMessage')}
            </Text>
            <Text variant="caption" muted style={styles.center}>
              {t('discount.validFor')}
            </Text>
          </View>
        ) : null}

        {variant === 'maxina' ? (
          <Text variant="caption" muted style={styles.center}>
            {tc(copy.redirecting)}
          </Text>
        ) : null}
        <Button testID="confirmed-continue" label={tc(copy.cta)} onPress={() => router.replace(target as never)} />
        <Text variant="caption" muted style={styles.center}>
          {tc(copy.footer)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 32 },
  card: { borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  badge: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  accent: { fontWeight: '500' },
  center: { textAlign: 'center' },
  discount: { borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', padding: 20, gap: 8, alignItems: 'center' },
  discountHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  code: { fontSize: 24, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
});
