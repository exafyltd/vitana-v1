/**
 * VTID-05524 — `/commerce/join`, the native twin of src/pages/CommerceJoin.tsx:
 * the supplier's front door (the shareable link; no sign-in needed to see
 * it). Register / sign in, the provider buttons first (Google, Apple), the
 * e-mail form only when asked for (password stays the e-mail method), "check
 * your inbox" after a sign-up, `?oauth_error=` turns into the retry message,
 * a signed-in visitor goes on to `?redirectTo=` (only a `/commerce` path,
 * never an open redirect) or `/commerce`.
 *
 * Same Supabase calls as the web: `signUp` with `full_name`, `tenant_slug:
 * maxina`, `preferred_role: community` and the confirmation link to
 * `/commerce?confirmed=true` on this build's auth link base; `signInWithPassword`;
 * both under the web's 15 s deadline. Google and Apple use the app's native
 * sign-in (the same methods the Maxina portal uses: native SDK +
 * `signInWithIdToken`, Apple on Android through the browser PKCE round trip).
 * Nothing more is asked than on the web.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, PressableRow, Text, useUITheme } from '../../ports/ui';
import { BizIcon, FadeIn, Input } from '../../ports/business-ui';
import { config, requireUrl } from '../../ports/env';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { SIGN_IN_DEADLINE_MS, signInWithApple, signInWithGoogle, type SignInResult } from '../../auth/sign-in';
import { deviceStorage, STORAGE_KEYS } from '../../identity/device-storage';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { ErrorAlert, Field } from './components/parts';

/** src/utils/redirectUrls.ts CONFIRMATION_PATHS.commerce. */
export const COMMERCE_CONFIRMATION_PATH = '/commerce?confirmed=true';

const PROVIDERS = [
  { id: 'google', label: 'screens.commerceportal.join.continueWithGoogle', name: 'Google' },
  { id: 'apple', label: 'screens.commerceportal.join.continueWithApple', name: 'Apple' },
] as const;

function withDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), SIGN_IN_DEADLINE_MS);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

/** `?redirectTo=` only when it is a `/commerce` path. */
export function commerceTarget(redirectTo: string | null | undefined): string {
  return redirectTo && redirectTo.startsWith('/commerce') ? redirectTo : '/commerce';
}

export function CommerceJoinScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ redirectTo?: string | string[]; oauth_error?: string | string[] }>();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const redirectTo = one(params.redirectTo);
  const [mode, setMode] = useState<'register' | 'signin'>('register');
  const [method, setMethod] = useState<'choose' | 'email'>('choose');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [error, setError] = useState(() => {
    const kind = one(params.oauth_error);
    if (kind === 'expired') return t('screens.commerceportal.join.oauthExpired');
    if (kind === 'cancelled' || kind === 'failed') return t('screens.commerceportal.join.oauthRetry');
    return '';
  });
  const [sentTo, setSentTo] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    navigateToWebPath(commerceTarget(redirectTo), { replace: true });
  }, [user, authLoading, redirectTo]);

  const continueWith = async (provider: (typeof PROVIDERS)[number]) => {
    setError('');
    void deviceStorage.setItem(STORAGE_KEYS.tenantSlug, 'maxina');
    setOauthBusy(true);
    let r: SignInResult;
    try {
      r = provider.id === 'google' ? await signInWithGoogle() : await signInWithApple('maxina');
    } catch {
      r = { ok: false };
    }
    setOauthBusy(false);
    if (!r.ok && !r.cancelled) setError(t('screens.commerceportal.join.oauthFailed', { provider: provider.name }));
    // Success: the effect above moves on once `user` settles.
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        const { error: err } = await withDeadline(getSupabase().auth.signInWithPassword({ email, password }));
        if (err) setError(err.message);
        return;
      }
      const emailRedirectTo = `${requireUrl(config, 'authRedirectUrl').replace(/\/+$/, '')}${COMMERCE_CONFIRMATION_PATH}`;
      const { error: err } = await withDeadline(
        getSupabase().auth.signUp({ email, password, options: { emailRedirectTo, data: { full_name: fullName, tenant_slug: 'maxina', preferred_role: 'community' } } }),
      );
      if (err) setError(err.message);
      else setSentTo(email);
    } catch (err) {
      setError(err instanceof Error && err.message === 'timeout' ? t('screens.commerceportal.join.timeout') : t('screens.commerceportal.join.failed'));
    } finally {
      setBusy(false);
    }
  };

  const registering = mode === 'register';
  const canSubmit = !busy && !!email.trim() && !!password && (!registering || !!fullName.trim());

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="screen-commerce-join">
        <FadeIn style={styles.stack}>
          <View style={styles.brand}>
            <BizIcon name="ShoppingBag" size={20} color={colors.primary} />
            <Text size="sm" weight="700" color={colors.primary} style={styles.tracking}>
              {'VITANALAND'}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text size="xs" muted numberOfLines={1} style={styles.fill}>
              {t('screens.commerceportal.portalEyebrow')}
            </Text>
          </View>

          {authLoading || user ? (
            <View style={styles.skeleton} testID="join-loading" />
          ) : sentTo ? (
            <View style={[styles.sent, { borderColor: colors.primary, backgroundColor: colors.card }]} testID="join-check-inbox">
              <BizIcon name="CheckCircle2" size={32} color={colors.primary} />
              <Text size="xl" weight="600" style={styles.center}>
                {t('screens.commerceportal.join.checkInboxTitle')}
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('screens.commerceportal.join.checkInboxBody', { email: sentTo })}
              </Text>
              <Button
                variant="ghost"
                onPress={() => {
                  setSentTo('');
                  setMode('signin');
                }}
                testID="join-already-confirmed"
              >
                {t('screens.commerceportal.join.alreadyConfirmed')}
              </Button>
            </View>
          ) : (
            <>
              <Text size="2xl" weight="600" accessibilityRole="header" testID="join-title">
                {registering ? t('screens.commerceportal.join.title') : t('screens.commerceportal.join.signinTitle')}
              </Text>
              <Text size="sm" muted>
                {registering ? t('screens.commerceportal.join.registerLead') : t('screens.commerceportal.join.signinLead')}
              </Text>
              {error ? <ErrorAlert text={error} testID="join-error" /> : null}

              {method === 'choose' ? (
                <View style={styles.gap}>
                  {PROVIDERS.map((p) => (
                    <Button key={p.id} variant="outline" size="lg" disabled={oauthBusy} onPress={() => void continueWith(p)} testID={`join-option-${p.id}`} style={styles.option}>
                      {t(p.label)}
                    </Button>
                  ))}
                  <View style={styles.or}>
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                    <Text size="xs" muted style={styles.caps}>
                      {t('screens.commerceportal.join.or')}
                    </Text>
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                  </View>
                  <Button
                    variant="outline"
                    size="lg"
                    onPress={() => {
                      setMethod('email');
                      setError('');
                    }}
                    testID="join-option-email"
                    style={styles.option}
                  >
                    <BizIcon name="Mail" size={20} color={colors.primary} />
                    {t('screens.commerceportal.join.continueWithEmail')}
                  </Button>
                </View>
              ) : (
                <View style={styles.gap} testID="join-email-form">
                  {registering ? (
                    <Field label={t('screens.commerceportal.join.yourName')}>
                      <Input value={fullName} onChangeText={setFullName} disabled={busy} autoComplete="name" testID="join-name" accessibilityLabel={t('screens.commerceportal.join.yourName')} />
                    </Field>
                  ) : null}
                  <Field label={t('screens.portals.email')}>
                    <Input type="email" value={email} onChangeText={setEmail} disabled={busy} autoCapitalize="none" autoComplete="email" testID="join-email" accessibilityLabel={t('screens.portals.email')} />
                  </Field>
                  <Field label={t('screens.portals.password')}>
                    <View style={styles.passwordRow}>
                      <Input
                        type="password"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        disabled={busy}
                        autoComplete={registering ? 'new-password' : 'current-password'}
                        style={styles.fill}
                        testID="join-password"
                        accessibilityLabel={t('screens.portals.password')}
                      />
                      <PressableRow onPress={() => setShowPassword((v) => !v)} accessibilityLabel={t('screens.commerceportal.join.togglePassword')} testID="join-toggle-password" style={styles.eye}>
                        <BizIcon name={showPassword ? 'EyeOff' : 'Eye'} size={16} color={colors.mutedForeground} />
                      </PressableRow>
                    </View>
                  </Field>
                  <Button onPress={() => void submit()} disabled={!canSubmit} testID="join-submit" style={styles.submit}>
                    {registering ? t('screens.commerceportal.join.registerCta') : t('screens.commerceportal.join.signinCta')}
                  </Button>
                  <PressableRow
                    onPress={() => {
                      setMethod('choose');
                      setError('');
                    }}
                    accessibilityLabel={t('screens.commerceportal.join.allOptions')}
                    testID="join-all-options"
                    style={styles.link}
                  >
                    <BizIcon name="ArrowLeft" size={16} color={colors.mutedForeground} flip />
                    <Text size="sm" muted>
                      {t('screens.commerceportal.join.allOptions')}
                    </Text>
                  </PressableRow>
                </View>
              )}

              <PressableRow
                onPress={() => {
                  setMode(registering ? 'signin' : 'register');
                  setError('');
                }}
                accessibilityLabel={registering ? t('screens.commerceportal.join.haveAccount') : t('screens.commerceportal.join.noAccount')}
                testID="join-toggle-mode"
                style={styles.link}
              >
                <Text size="sm" muted style={styles.center}>
                  {registering ? t('screens.commerceportal.join.haveAccount') : t('screens.commerceportal.join.noAccount')}
                </Text>
              </PressableRow>
            </>
          )}
          <Text size="xs" muted style={[styles.center, styles.foot]}>
            {t('screens.commerceportal.footNote')}
          </Text>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 48 },
  stack: { gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  tracking: { letterSpacing: 2.8 },
  divider: { width: 1, height: 16 },
  fill: { flex: 1, minWidth: 0 },
  skeleton: { height: 240 },
  sent: { borderWidth: 1, borderRadius: 24, padding: 24, gap: 8, alignItems: 'center', marginTop: 20 },
  center: { textAlign: 'center' },
  gap: { gap: 12, marginTop: 12 },
  option: { minHeight: 48, borderRadius: 12, gap: 10 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  line: { flex: 1, height: 1 },
  caps: { textTransform: 'uppercase', letterSpacing: 1 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: { width: 44, height: 44, justifyContent: 'center' },
  submit: { minHeight: 44, borderRadius: 12 },
  link: { minHeight: 44, justifyContent: 'center', gap: 6 },
  foot: { marginTop: 32 },
});
