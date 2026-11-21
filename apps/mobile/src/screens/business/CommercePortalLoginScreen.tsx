/**
 * VTID-05524 — `/commerce-login`, the native twin of
 * src/pages/portals/CommercePortalLogin.tsx: the Commerce Portal's own
 * sign-in card (dark, centred; e-mail + password with show/hide; the Supabase
 * error message, or the portal's own on an unexpected failure; "Back to the
 * public portal"). A signed-in visitor goes straight to `/commerce`.
 * The web wraps the page in the app's dark theme scope; natively the card
 * uses the dark token set the same way (`UIProvider colorScheme="dark"`).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, UIProvider, useUITheme } from '../../ports/ui';
import { BizIcon, Input, withAlpha } from '../../ports/business-ui';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { ErrorAlert, Field } from './components/parts';

function LoginCard(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: err } = await getSupabase().auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } catch {
      setError(t('screens.commerceportal.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: withAlpha(colors.primary, 0.15), backgroundColor: colors.card }]} testID="commerce-login-card">
      <View style={styles.headerBlock}>
        <BizIcon name="ShoppingBag" size={40} color={colors.primary} />
        <Text size="2xl" weight="700" color={colors.primary}>
          {'VITANALAND'}
        </Text>
        <Text muted>{t('screens.commerceportal.loginSubtitle')}</Text>
      </View>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text size="sm" muted style={styles.center}>
        {t('screens.commerceportal.loginIntro')}
      </Text>
      {error ? <ErrorAlert text={error} testID="commerce-login-error" /> : null}
      <Field label={t('screens.portals.email')}>
        <Input type="email" value={email} onChangeText={setEmail} disabled={loading} autoCapitalize="none" testID="commerce-login-email" accessibilityLabel={t('screens.portals.email')} />
      </Field>
      <Field label={t('screens.portals.password')}>
        <View style={styles.passwordRow}>
          <Input type="password" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} disabled={loading} style={styles.fill} testID="commerce-login-password" accessibilityLabel={t('screens.portals.password')} />
          <PressableRow onPress={() => setShowPassword((v) => !v)} accessibilityLabel={t('screens.commerceportal.join.togglePassword')} testID="commerce-login-toggle" style={styles.eye}>
            <BizIcon name={showPassword ? 'EyeOff' : 'Eye'} size={16} color={colors.mutedForeground} />
          </PressableRow>
        </View>
      </Field>
      <Button onPress={() => void handleSignIn()} disabled={loading || !email || !password} testID="commerce-login-submit">
        {loading ? t('screens.portals.signing') : t('screens.commerceportal.loginButton')}
      </Button>
      <PressableRow onPress={() => navigateToWebPath('/')} accessibilityRole="link" accessibilityLabel={t('screens.portals.backPublicPortal')} testID="commerce-login-back" style={styles.back}>
        <Text size="sm" muted>
          {t('screens.portals.backPublicPortal')}
        </Text>
      </PressableRow>
    </View>
  );
}

function Page(): ReactElement {
  const { colors } = useUITheme();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="screen-commerce-login">
        <LoginCard />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function CommercePortalLoginScreen(): ReactElement {
  const { user, loading } = useAuth();
  const { direction } = useUITheme();
  useEffect(() => {
    if (!loading && user) navigateToWebPath('/commerce');
  }, [user, loading]);
  return (
    <UIProvider colorScheme="dark" direction={direction}>
      {loading || user ? <View style={styles.root} testID="commerce-login-loading" /> : <Page />}
    </UIProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 448, alignSelf: 'center', borderWidth: 1, borderRadius: 12, padding: 32, gap: 16 },
  headerBlock: { alignItems: 'center', gap: 8 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  center: { textAlign: 'center' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1, minWidth: 0 },
  eye: { width: 44, height: 44, justifyContent: 'center' },
  back: { justifyContent: 'center', minHeight: 44, marginTop: 8 },
});
