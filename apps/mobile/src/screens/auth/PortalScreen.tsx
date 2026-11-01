/**
 * VTID-05186 (N3, plan change 16) — the functional sign-in / sign-up surface of
 * MaxinaPortal.tsx and AlkalmaPortal.tsx: the same tabs, fields, order and
 * catalog keys.
 *
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * Maxina portal's mobile-web chrome (PortalChrome.tsx): backdrop overlay, the
 * translucent card, the "part of VITANA" footer with Privacy · Terms · Help,
 * the Orb discovery hint, the `?diag=1` badge and the `?confirmed=true`
 * toast. `/alkalma` now renders the generic TenantPortalScreen like the web
 * (App.tsx:878 `<TenantPortal slug="alkalma" />`); the `alkalma` keys below
 * stay for the AlkalmaPortal.tsx shape.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DelayedLoader, RadioGroup, Text, PressableRow, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { signInWithApple, signInWithGoogle, signInWithPassword, signUpWithPassword, type PortalTenant, type SignInResult } from '../../auth/sign-in';
import { ConfigMissingError } from '../../ports/env';
import { ConfigMissing } from '../ConfigMissing';
import { Button, ErrorLine, Field } from './form';
import { usePostSignIn } from './usePostSignIn';
import { DiagBadge, OrbDiscoveryHint, PortalBackdrop, PortalFooter, useConfirmedToast } from './PortalChrome';

/** The catalog keys each portal uses (MaxinaPortal.tsx:545-847, AlkalmaPortal.tsx:188-410). */
export const PORTAL_KEYS: Record<PortalTenant, Record<string, string>> = {
  maxina: {
    signInTab: 'authPage.signIn',
    signUpTab: 'portals.maxina.joinMaxina',
    signInTitle: 'portals.maxina.welcomeBack',
    signInSubtitle: 'portals.maxina.continueJourney',
    email: 'authPage.email',
    emailPlaceholder: 'screens.portals.youExampleCom',
    password: 'authPage.password',
    forgot: 'portals.maxina.forgotPassword',
    signIn: 'authPage.signIn',
    signingIn: 'portals.maxina.signingIn',
    orContinue: 'authPage.orContinueWith',
    signUpTitle: 'portals.maxina.joinCommunity',
    signUpSubtitle: 'portals.maxina.createAccount',
    fullName: 'authPage.fullName',
    fullNamePlaceholder: 'portals.maxina.yourFullName',
    createAccount: 'authPage.createAccount',
    creatingAccount: 'portals.maxina.creatingAccount',
  },
  alkalma: {
    signInTab: 'screens.portals.sign',
    signUpTab: 'screens.portals.joinAlkalma',
    signInTitle: 'screens.portals.welcomeBack',
    signInSubtitle: 'screens.portals.signYourAlkalmaAccount',
    email: 'screens.portals.email',
    emailPlaceholder: 'screens.portals.yourEmailCom',
    password: 'screens.portals.password',
    forgot: 'portals.maxina.forgotPassword',
    signIn: 'screens.portals.sign',
    signingIn: 'screens.portals.signing',
    orContinue: 'screens.portals.continueWith',
    signUpTitle: 'screens.portals.joinAlkalma',
    signUpSubtitle: 'screens.portals.createYourAccountChooseYourRole',
    fullName: 'screens.portals.fullName',
    fullNamePlaceholder: 'screens.portals.yourFullName',
    createAccount: 'screens.portals.joinAlkalma',
    creatingAccount: 'screens.portals.creatingAccount',
  },
};

const ALKALMA_ROLES = ['community', 'patient', 'professional'] as const;

export function PortalScreen({ tenant }: { tenant: PortalTenant }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ redirectTo?: string; tab?: string; confirmed?: string; diag?: string }>();
  const { loading, configMissing } = useAuth();
  const { redirecting } = usePostSignIn(tenant, typeof params.redirectTo === 'string' ? params.redirectTo : null);
  const k = PORTAL_KEYS[tenant];
  const [tab, setTab] = useState<'signin' | 'signup'>(params.tab === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>('community');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [missing, setMissing] = useState<readonly string[] | null>(null);
  const chrome = tenant === 'maxina';
  useConfirmedToast(chrome && params.confirmed === 'true');

  if (configMissing) return <ConfigMissing keys={configMissing} />;
  if (missing) return <ConfigMissing keys={missing} />;
  if (loading || redirecting) return <DelayedLoader accessibilityLabel={t('common.loading')} />;

  const run = async (work: () => Promise<SignInResult>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await work();
      if (!r.ok && !r.cancelled) setError(r.errorKey ? t(r.errorKey) : (r.message ?? t('screens.portals.somethingWentWrong')));
      return r;
    } catch (e) {
      if (e instanceof ConfigMissingError) setMissing(e.keys);
      else setError(t('screens.portals.somethingWentWrong'));
      return { ok: false } as SignInResult;
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <View style={styles.center} testID="portal-check-email">
        <Text variant="title" accessibilityRole="header">
          {t('screens.portals.checkYourEmail')}
        </Text>
        <Text muted>{t('screens.portals.weVeSentConfirmationLink')}</Text>
        <Text>{sentTo}</Text>
        <Button testID="portal-use-different-email" variant="link" label={t('screens.portals.useDifferentEmail')} onPress={() => setSentTo(null)} />
      </View>
    );
  }

  const form = (
    <>
      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.muted }]}>
        {(['signin', 'signup'] as const).map((id) => (
          <PressableRow
            key={id}
            testID={`portal-tab-${id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id ? { backgroundColor: colors.background } : null]}
          >
            <Text style={{ fontWeight: tab === id ? '600' : '400' }}>{t(id === 'signin' ? k.signInTab : k.signUpTab)}</Text>
          </PressableRow>
        ))}
      </View>

      <Text variant="title" accessibilityRole="header">
        {t(tab === 'signin' ? k.signInTitle : k.signUpTitle)}
      </Text>
      <Text muted>{t(tab === 'signin' ? k.signInSubtitle : k.signUpSubtitle)}</Text>

      {tab === 'signup' ? (
        <Field testID="portal-full-name" label={t(k.fullName)} placeholder={t(k.fullNamePlaceholder)} value={fullName} onChangeText={setFullName} autoComplete="name" />
      ) : null}
      <Field
        testID="portal-email"
        label={t(k.email)}
        placeholder={t(k.emailPlaceholder)}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Field testID="portal-password" label={t(k.password)} value={password} onChangeText={setPassword} secureTextEntry autoComplete={tab === 'signin' ? 'current-password' : 'new-password'} />

      {tab === 'signup' && tenant === 'alkalma' ? (
        <View style={{ gap: 4 }}>
          <Text variant="label">{t('screens.portals.iAmJoiningAs')}</Text>
          <RadioGroup
            testID="portal-role"
            accessibilityLabel={t('screens.portals.iAmJoiningAs')}
            value={role}
            onChange={setRole}
            options={ALKALMA_ROLES.map((r) => ({ value: r, label: t(`screens.portals.${r}`) }))}
          />
        </View>
      ) : null}

      {error ? <ErrorLine>{error}</ErrorLine> : null}

      {tab === 'signin' ? (
        <>
          <Button testID="portal-forgot" variant="link" label={t(k.forgot)} onPress={() => router.navigate('/reset-password' as never)} />
          <Button testID="portal-submit" label={t(k.signIn)} busyLabel={t(k.signingIn)} busy={busy} onPress={() => void run(() => signInWithPassword(email.trim(), password))} />
        </>
      ) : (
        <Button
          testID="portal-submit"
          label={t(k.createAccount)}
          busyLabel={t(k.creatingAccount)}
          busy={busy}
          onPress={() =>
            void run(() => signUpWithPassword({ email: email.trim(), password, fullName: fullName.trim(), tenant, preferredRole: tenant === 'alkalma' ? role : 'community' })).then((r) => {
              if (r.ok) setSentTo(email.trim());
            })
          }
        />
      )}

      <Text variant="caption" muted style={styles.or}>
        {t(k.orContinue)}
      </Text>
      <View style={styles.social}>
        <Button testID="portal-apple" variant="outline" label={t('screens.portals.apple')} disabled={busy} onPress={() => void run(() => signInWithApple(tenant))} />
        <Button testID="portal-google" variant="outline" label={t('screens.portals.google')} disabled={busy} onPress={() => void run(() => signInWithGoogle())} />
      </View>
    </>
  );

  if (!chrome) {
    return (
      <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled" testID={`portal-${tenant}`}>
        {form}
      </ScrollView>
    );
  }

  return (
    <View style={styles.page}>
      <PortalBackdrop />
      <ScrollView contentContainerStyle={styles.chromeRoot} keyboardShouldPersistTaps="handled" testID={`portal-${tenant}`}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="portal-card">
          {form}
        </View>
        <PortalFooter />
      </ScrollView>
      <OrbDiscoveryHint />
      <DiagBadge enabled={params.diag === '1'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 32, gap: 12 },
  page: { flex: 1 },
  chromeRoot: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 16, paddingTop: 64, paddingBottom: 128 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, gap: 12 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tab: { flex: 1, justifyContent: 'center', borderRadius: 8, paddingVertical: 8 },
  or: { textAlign: 'center' },
  social: { gap: 8 },
});
