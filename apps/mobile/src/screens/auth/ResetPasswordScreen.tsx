/**
 * VTID-05186 (N3, plan change 16) — src/pages/auth/ResetPassword.tsx: request a
 * reset link (link base from `authRedirectUrl`, `?type=recovery` like the web),
 * or, on a recovery link, set the new password. Same catalog keys.
 *
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * mobile-web card: the ruby Lock / MailCheck / success badges, the request
 * button disabled until an email is typed, the new-password rules (at least
 * 6 characters, both fields equal, the inline "Passwords don't match", submit
 * disabled until valid), the show / hide password toggle and the
 * "Update password" label (hardcoded English on the web, a catalog key here).
 * The recovery link itself resolves through `resolve-link` (→ `auth`) and
 * link-bridge.ts opens this screen with `?type=recovery`.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { AuthIcon, useAuthPalette, withAlpha } from '../../ports/auth';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { sendPasswordReset } from '../../auth/sign-in';
import { ConfigMissingError } from '../../ports/env';
import { ConfigMissing } from '../ConfigMissing';
import { Button, ErrorLine, Field } from './form';

/** ResetPassword.tsx `minLength={6}` / `password.length >= 6`. */
export const MIN_PASSWORD_LENGTH = 6;

function Badge({ name, success }: { name: string; success?: boolean }) {
  const palette = useAuthPalette();
  const tint = success ? palette.success : palette.ruby;
  return (
    <View style={[styles.badge, { backgroundColor: success ? palette.successSubtle : withAlpha(palette.ruby, 0.1) }]}>
      <AuthIcon name={name} size={28} color={tint} />
    </View>
  );
}

export function ResetPasswordScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { configMissing } = useAuth();
  const params = useLocalSearchParams<{ type?: string }>();
  const recovery = params.type === 'recovery';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<readonly string[] | null>(null);

  if (configMissing) return <ConfigMissing keys={configMissing} />;
  if (missing) return <ConfigMissing keys={missing} />;

  const passwordsMatch = password === confirm;
  const valid = password.length >= MIN_PASSWORD_LENGTH && passwordsMatch;

  const request = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await sendPasswordReset(email.trim());
      if (r.ok) setDone(true);
      else setError(r.errorKey ? t(r.errorKey) : (r.message ?? t('screens.portals.somethingWentWrong')));
    } catch (e) {
      if (e instanceof ConfigMissingError) setMissing(e.keys);
      else setError(t('screens.portals.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  };

  const update = async () => {
    if (!passwordsMatch) {
      setError(t('screens.auth.passwordsDonTMatch'));
      return;
    }
    if (!valid) return;
    setBusy(true);
    setError(null);
    const { error: e } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (e) setError(e.message);
    else setDone(true);
  };

  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

  if (done) {
    return (
      <ScrollView contentContainerStyle={styles.root} testID="reset-done">
        <View style={card}>
          <Badge name={recovery ? 'CheckCircle2' : 'MailCheck'} success={recovery} />
          <Text variant="title" accessibilityRole="header" style={styles.center}>
            {t(recovery ? 'screens.auth.passwordUpdated' : 'screens.auth.checkYourEmail')}
          </Text>
          <Text muted style={styles.center}>
            {t(recovery ? 'screens.auth.yourPasswordHasSuccessfullyReset' : 'screens.auth.weVeSentPasswordResetLink')}
          </Text>
          {recovery ? null : (
            <Text variant="caption" muted style={styles.center}>
              {t('screens.auth.ifYouDonTSeeIt')}
            </Text>
          )}
          <Button
            testID="reset-back"
            variant={recovery ? 'primary' : 'link'}
            label={t(recovery ? 'screens.auth.continueMaxina' : 'screens.auth.backMaxina')}
            onPress={() => router.replace('/maxina' as never)}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled" testID="reset-password">
      <View style={card}>
        <Badge name="Lock" />
        <Text variant="title" accessibilityRole="header" style={styles.center}>
          {t(recovery ? 'screens.auth.setNewPassword' : 'screens.auth.resetYourPassword')}
        </Text>
        <Text muted style={styles.center}>
          {t(recovery ? 'screens.auth.chooseStrongPasswordForYourAccount' : 'screens.auth.enterYourEmailWeLlSend')}
        </Text>
        {recovery ? (
          <>
            <View>
              <Field
                testID="reset-new-password"
                label={t('screens.auth.newPassword')}
                placeholder={t('screens.auth.atLeast6Characters')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                autoFocus
              />
              <PressableRow
                testID="reset-toggle-password"
                accessibilityRole="button"
                accessibilityLabel={t(showPassword ? 'authPortalsNative.reset.hidePassword' : 'authPortalsNative.reset.showPassword')}
                accessibilityState={{ checked: showPassword }}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.toggle}
              >
                <AuthIcon name={showPassword ? 'EyeOff' : 'Eye'} size={16} color={colors.mutedForeground} />
              </PressableRow>
            </View>
            <Field
              testID="reset-confirm-password"
              label={t('screens.auth.confirmPassword')}
              placeholder={t('screens.auth.reenterYourPassword')}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            {confirm && !passwordsMatch ? (
              <Text variant="caption" style={{ color: colors.destructive }} testID="reset-mismatch">
                {t('screens.auth.passwordsDonTMatch')}
              </Text>
            ) : null}
          </>
        ) : (
          <Field
            testID="reset-email"
            label={t('screens.auth.emailAddress')}
            placeholder={t('screens.auth.youExampleCom')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            autoFocus
          />
        )}
        {error ? <ErrorLine>{error}</ErrorLine> : null}
        <Button
          testID="reset-submit"
          label={t(recovery ? 'authPortalsNative.reset.updatePassword' : 'screens.auth.sendResetLink')}
          busyLabel={t(recovery ? 'screens.auth.updating' : 'screens.auth.sending')}
          busy={busy}
          disabled={recovery ? !valid : !email.trim()}
          onPress={() => void (recovery ? update() : request())}
        />
        <Button testID="reset-back" variant="link" label={t('screens.auth.backMaxina')} onPress={() => router.replace('/maxina' as never)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 48 },
  card: { borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  badge: { alignSelf: 'center', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  toggle: { position: 'absolute', end: 4, bottom: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
