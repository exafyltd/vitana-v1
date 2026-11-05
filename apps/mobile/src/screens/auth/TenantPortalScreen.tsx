/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * generic community portal at `/:tenantSlug` and `/alkalma`
 * (src/pages/portals/TenantPortal.tsx + src/components/portal/TenantAuthCard.tsx,
 * VTID-05151), phone branch: a plain column, the sign-in / join SplitBar above
 * the hero, the auth card below.
 *
 * Slug checks, in the web's order: malformed → not found; a retired slug →
 * its successor; on the generic route a path the web routes statically
 * (`isStaticDestination`, App.tsx routes outrank `/:tenantSlug`) renders the
 * `fallback` (the resolver) instead; otherwise `resolve_tenant` decides —
 * unknown → not found, a failed call → the error state with Retry (no Maxina
 * fallback).
 *
 * Anonymous: sign in (then switch into the tenant), sign up only for an
 * `open_signup` tenant, OAuth only when `landing.oauth`. Signed-in member:
 * switch once if needed, then the tenant's post-login path
 * (`portalLandingTarget`, never a portal path). Signed-in non-member: Join for
 * an open tenant, else the invite-only notice. Submit waits for the web form's
 * required fields (sign-up password ≥ 6). Sign-in / sign-up / resend go
 * through src/auth/sign-in.ts, the one auth-write path.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { DelayedLoader, PressableRow, Text, useUITheme } from '../../ports/ui';
import { AuthIcon, notifyError, notifySuccess } from '../../ports/auth';
import { RETIRED_TENANT_SLUGS, SLUG_RE, portalLandingTarget, type TenantEntry } from '../../ports/core';
import { ConfigMissingError } from '../../ports/env';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { useTenant, type TenantSwitchResult } from '../../identity/TenantProvider';
import { resendConfirmation, signInWithApple, signInWithGoogle, signInWithPassword, signUpWithPassword, type SignInResult } from '../../auth/sign-in';
import { isStaticDestination } from '../../navigation/resolve';
import { ConfigMissing } from '../ConfigMissing';
import NotFound from '../../../app/+not-found';
import { Button, ErrorLine, Field } from './form';
import { fetchMembership, fetchTenantBySlug, membershipQueryKey, resolveTenantQueryKey, tenantAssetUrl } from './tenant-portal-data';

export type TenantAuthMode = 'signin' | 'signup';

/** ResendConfirmationButton.tsx cooldowns (s). */
export const RESEND_COOLDOWN_S = 60;
export const RESEND_RATE_LIMIT_COOLDOWN_S = 120;
/** TenantAuthCard.tsx sign-up `minLength={6}`. */
export const TENANT_MIN_PASSWORD_LENGTH = 6;

function joinErrorText(res: TenantSwitchResult, brand: string, t: (k: string, p?: Record<string, string | number>) => string): string {
  return !res.ok && res.code === 'not_joinable' ? t('tenantPortal.errors.notJoinable', { brand }) : t('tenantPortal.errors.generic');
}

export function TenantPortalScreen({ slug: fixedSlug, fallback }: { slug?: string; fallback?: ReactNode }) {
  const params = useLocalSearchParams<{ tenantSlug?: string }>();
  const pathname = usePathname();
  const slug = String(fixedSlug ?? params.tenantSlug ?? '').toLowerCase();

  if (!SLUG_RE.test(slug)) return fallback ? <>{fallback}</> : <NotFound />;
  const successor = RETIRED_TENANT_SLUGS[slug];
  if (successor) return <Redirect href={`/${successor}` as never} />;
  if (fallback && isStaticDestination(pathname || `/${slug}`)) return <>{fallback}</>;
  return <ResolvedTenantPortal slug={slug} />;
}

function PortalColumn({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <ScrollView contentContainerStyle={styles.column} keyboardShouldPersistTaps="handled" testID={testID ?? 'tenant-portal'}>
      {children}
    </ScrollView>
  );
}

function PortalError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.errorBox, { borderColor: colors.border, backgroundColor: colors.card }]} testID="tenant-portal-error">
      <AuthIcon name="AlertCircle" size={48} color={colors.mutedForeground} />
      <Text variant="title" accessibilityRole="header" style={styles.center}>
        {t('tenantPortal.loadError.title')}
      </Text>
      <Text muted style={styles.center}>
        {t('tenantPortal.loadError.description')}
      </Text>
      <Button testID="tenant-portal-retry" label={t('tenantPortal.retry')} onPress={onRetry} />
    </View>
  );
}

function ResolvedTenantPortal({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { configMissing } = useAuth();
  const query = useQuery({
    queryKey: resolveTenantQueryKey(slug),
    queryFn: () => fetchTenantBySlug(slug),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: !configMissing,
  });
  if (configMissing) return <ConfigMissing keys={configMissing} />;
  if (query.isLoading) return <DelayedLoader accessibilityLabel={t('common.loading')} />;
  if (query.isError) {
    return (
      <PortalColumn>
        <PortalError onRetry={() => void query.refetch()} />
      </PortalColumn>
    );
  }
  if (!query.data) return <NotFound />;
  return <TenantPortalPage entry={query.data} />;
}

type MemberState = 'unknown' | 'member' | 'non-member' | 'error';

function TenantHero({ entry, brand }: { entry: TenantEntry; brand: string }) {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const logo = tenantAssetUrl(entry.brand.logo_path, entry.slug);
  const tagline = entry.landing.tagline?.[locale] ?? t('tenantPortal.tagline', { brand });
  return (
    <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]} testID="tenant-hero">
      {logo ? <Image source={{ uri: logo }} accessibilityLabel={t('tenantPortal.logoAlt', { brand })} style={styles.logo} resizeMode="contain" /> : null}
      <Text variant="title" accessibilityRole="header" testID="tenant-name">
        {brand}
      </Text>
      <Text muted>{tagline}</Text>
    </View>
  );
}

function TenantPortalPage({ entry }: { entry: TenantEntry }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user, loading: authLoading } = useAuth();
  const { tenant, setTenantBySlug, registry } = useTenant();
  const search = useLocalSearchParams<{ confirmed?: string }>();
  const [mode, setMode] = useState<TenantAuthMode>('signin');
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const switchedRef = useRef(false);
  const brand = entry.display_name;
  const confirmed = search.confirmed === 'true';

  const membership = useQuery({
    queryKey: membershipQueryKey(user?.id, entry.tenant_id),
    enabled: !!user,
    queryFn: () => fetchMembership(user!.id, entry.tenant_id),
  });
  const memberState: MemberState = !user ? 'unknown' : membership.isError ? 'error' : membership.data === undefined ? 'unknown' : membership.data ? 'member' : 'non-member';

  useEffect(() => {
    if (!user || switchedRef.current) return;
    if (memberState === 'member' && tenant?.slug === entry.slug) {
      switchedRef.current = true;
      router.replace(portalLandingTarget(entry, registry) as never);
      return;
    }
    if (memberState === 'member' || (justSignedIn && memberState === 'non-member')) {
      switchedRef.current = true;
      setJoining(true);
      void setTenantBySlug(entry.slug).then((res) => {
        setJoining(false);
        if (res.ok) router.replace(portalLandingTarget(entry, registry) as never);
        else setJoinError(joinErrorText(res, brand, t));
      });
    }
  }, [user, memberState, justSignedIn, tenant?.slug, entry, registry, setTenantBySlug, brand, t]);

  const handleJoin = async () => {
    if (joining) return;
    switchedRef.current = true;
    setJoining(true);
    setJoinError(null);
    const res = await setTenantBySlug(entry.slug);
    setJoining(false);
    if (res.ok) router.replace(portalLandingTarget(entry, registry) as never);
    else setJoinError(joinErrorText(res, brand, t));
  };

  if (!user) {
    if (authLoading) return <DelayedLoader accessibilityLabel={t('common.loading')} />;
    return (
      <PortalColumn testID={`tenant-portal-${entry.slug}`}>
        <View accessibilityRole="tablist" accessibilityLabel={t('tenantPortal.tabsAria')} style={[styles.tabs, { backgroundColor: colors.muted }]}>
          {(['signin', 'signup'] as const).map((id) => (
            <PressableRow
              key={id}
              testID={`tenant-tab-${id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === id }}
              onPress={() => setMode(id)}
              style={[styles.tab, mode === id ? { backgroundColor: colors.background } : null]}
            >
              <Text style={{ fontWeight: mode === id ? '600' : '400', textAlign: 'center' }}>{t(id === 'signin' ? 'tenantPortal.signInTab' : 'tenantPortal.signUpTab')}</Text>
            </PressableRow>
          ))}
        </View>
        <TenantHero entry={entry} brand={brand} />
        {confirmed ? (
          <View accessibilityRole="text" accessibilityLiveRegion="polite" style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.card }]} testID="tenant-confirmed">
            <Text>{t('tenantPortal.confirmed')}</Text>
          </View>
        ) : null}
        <View style={[styles.cardBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <TenantAuthCard entry={entry} brand={brand} mode={mode} onSignedIn={() => setJustSignedIn(true)} />
        </View>
      </PortalColumn>
    );
  }

  const busy = !joinError && (memberState === 'unknown' || memberState === 'member' || joining || justSignedIn);
  return (
    <PortalColumn testID={`tenant-portal-${entry.slug}`}>
      <TenantHero entry={entry} brand={brand} />
      {memberState === 'error' ? (
        <PortalError onRetry={() => void membership.refetch()} />
      ) : busy ? (
        <DelayedLoader accessibilityLabel={t('common.loading')} />
      ) : (
        <View style={[styles.cardBox, { borderColor: colors.border, backgroundColor: colors.card }]} testID="tenant-join">
          {entry.open_signup ? (
            <>
              <Text muted>{t('tenantPortal.joinIntro', { brand })}</Text>
              <Button testID="tenant-join-button" label={t('tenantPortal.join', { brand })} disabled={joining} onPress={() => void handleJoin()} />
            </>
          ) : (
            <Text muted testID="tenant-invite-only">
              {t('tenantPortal.inviteOnly', { brand })}
            </Text>
          )}
          {joinError ? <ErrorLine>{joinError}</ErrorLine> : null}
        </View>
      )}
    </PortalColumn>
  );
}

function ResendConfirmation({ email, slug }: { email: string; slug: string }) {
  const { t } = useI18n();
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);
  const onPress = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    try {
      const r = await resendConfirmation(email, slug);
      if (r.ok) {
        notifySuccess('toasts.auth.confirmationEmailSentPleaseCheckYour');
        setCooldown(RESEND_COOLDOWN_S);
      } else if (r.rateLimited) {
        notifyError('toasts.auth.tooManyAttemptsPleaseWaitFew');
        setCooldown(RESEND_RATE_LIMIT_COOLDOWN_S);
      } else {
        notifyError('tenantPortal.errors.generic');
      }
    } catch {
      notifyError('tenantPortal.errors.generic');
    } finally {
      setSending(false);
    }
  };
  const label = sending ? t('screens.auth.sending') : cooldown > 0 ? t('screens.auth.resendAvailableCooldownS', { cooldown }) : t('authPortalsNative.resend.prompt');
  return <Button testID="tenant-resend" variant="link" label={label} disabled={cooldown > 0 || sending} onPress={() => void onPress()} />;
}

function TenantAuthCard({ entry, brand, mode, onSignedIn }: { entry: TenantEntry; brand: string; mode: TenantAuthMode; onSignedIn: () => void }) {
  const { t } = useI18n();
  const slug = entry.slug;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [missing, setMissing] = useState<readonly string[] | null>(null);

  if (missing) return <ConfigMissing keys={missing} />;

  // The web form's `required` / `minLength` fields: submit only when they hold.
  const signInReady = !!email.trim() && !!password;
  const signUpReady = !!fullName.trim() && !!email.trim() && password.length >= TENANT_MIN_PASSWORD_LENGTH;

  const guard = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      if (e instanceof ConfigMissingError) setMissing(e.keys);
      else setError(t('tenantPortal.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = () =>
    guard(async () => {
      const r = await signInWithPassword(email.trim(), password);
      if (!r.ok) {
        setError(r.errorKey === 'screens.portals.signinTakingLongerThanExpected' ? t(r.errorKey) : t('tenantPortal.errors.signInFailed'));
        return;
      }
      onSignedIn();
    });

  const handleSignUp = () =>
    guard(async () => {
      if (!entry.open_signup) return;
      const r = await signUpWithPassword({ email: email.trim(), password, fullName: fullName.trim(), tenant: slug });
      if (!r.ok) {
        setError(/already registered/i.test(r.message ?? '') ? t('tenantPortal.errors.alreadyRegistered') : t('tenantPortal.errors.generic'));
        return;
      }
      setSignupEmail(email.trim());
    });

  const handleOAuth = (provider: 'google' | 'apple') =>
    guard(async () => {
      const r: SignInResult = provider === 'apple' ? await signInWithApple(slug) : await signInWithGoogle();
      if (!r.ok && !r.cancelled) setError(t('tenantPortal.errors.generic'));
    });

  const oauth =
    entry.landing.oauth === true ? (
      <View style={styles.oauth} testID="tenant-oauth">
        <Text variant="caption" muted style={styles.center}>
          {t('screens.portals.continueWith')}
        </Text>
        <View style={styles.oauthRow}>
          <View style={styles.flex}>
            <Button testID="tenant-google" variant="outline" label={t('screens.portals.google')} disabled={busy} onPress={() => void handleOAuth('google')} />
          </View>
          <View style={styles.flex}>
            <Button testID="tenant-apple" variant="outline" label={t('screens.portals.apple')} disabled={busy} onPress={() => void handleOAuth('apple')} />
          </View>
        </View>
      </View>
    ) : null;

  const errorLine = error ? <ErrorLine>{error}</ErrorLine> : null;

  if (mode === 'signin') {
    return (
      <View style={styles.form} accessibilityLabel={t('tenantPortal.signInTitle', { brand })} testID="tenant-signin">
        <Field testID="tenant-signin-email" label={t('screens.portals.email')} placeholder={t('screens.portals.yourEmailCom')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
        <Field testID="tenant-signin-password" label={t('screens.portals.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
        {errorLine}
        <Button testID="tenant-signin-submit" label={t('tenantPortal.signInButton')} busyLabel={t('screens.portals.signing')} busy={busy} disabled={!signInReady} onPress={() => void handleSignIn()} />
        {oauth}
      </View>
    );
  }

  if (!entry.open_signup) {
    return (
      <Text muted testID="tenant-invite-only">
        {t('tenantPortal.inviteOnly', { brand })}
      </Text>
    );
  }

  if (signupEmail) {
    return (
      <View style={styles.form} accessibilityLiveRegion="polite" testID="tenant-signup-sent">
        <Text style={{ fontWeight: '600' }}>{t('screens.portals.checkYourEmail')}</Text>
        <Text muted>{t('tenantPortal.checkEmail', { email: signupEmail })}</Text>
        <ResendConfirmation email={signupEmail} slug={slug} />
        <Button testID="tenant-use-different-email" variant="link" label={t('screens.portals.useDifferentEmail')} onPress={() => setSignupEmail(null)} />
      </View>
    );
  }

  return (
    <View style={styles.form} accessibilityLabel={t('tenantPortal.signUpTitle', { brand })} testID="tenant-signup">
      <Field testID="tenant-signup-name" label={t('screens.portals.fullName')} placeholder={t('screens.portals.yourFullName')} value={fullName} onChangeText={setFullName} autoComplete="name" />
      <Field testID="tenant-signup-email" label={t('screens.portals.email')} placeholder={t('screens.portals.yourEmailCom')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <Field testID="tenant-signup-password" label={t('screens.portals.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      {errorLine}
      <Button testID="tenant-signup-submit" label={t('tenantPortal.signUpButton')} busyLabel={t('screens.portals.creatingAccount')} busy={busy} disabled={!signUpReady} onPress={() => void handleSignUp()} />
      {oauth}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 32, gap: 20 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tab: { flex: 1, justifyContent: 'center', borderRadius: 8, paddingVertical: 8, minHeight: 44 },
  hero: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  logo: { width: '100%', height: 120 },
  notice: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  cardBox: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  errorBox: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', gap: 8 },
  form: { gap: 16 },
  oauth: { gap: 8 },
  oauthRow: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
