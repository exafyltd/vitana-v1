/**
 * VTID-05186 (N3, plan change 16) — src/pages/auth/ResetPassword.tsx: request a
 * reset link (link base from `authRedirectUrl`, `?type=recovery` like the web),
 * or, on a recovery link, set the new password. Same catalog keys.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { sendPasswordReset } from '../../auth/sign-in';
import { ConfigMissingError } from '../../ports/env';
import { ConfigMissing } from '../ConfigMissing';
import { Button, ErrorLine, Field } from './form';

export function ResetPasswordScreen() {
  const { t } = useI18n();
  const { configMissing } = useAuth();
  const params = useLocalSearchParams<{ type?: string }>();
  const recovery = params.type === 'recovery';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<readonly string[] | null>(null);

  if (configMissing) return <ConfigMissing keys={configMissing} />;
  if (missing) return <ConfigMissing keys={missing} />;

  const request = async () => {
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
    if (password !== confirm) {
      setError(t('screens.auth.passwordsDonTMatch'));
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (e) setError(e.message);
    else setDone(true);
  };

  if (done) {
    return (
      <ScrollView contentContainerStyle={styles.root} testID="reset-done">
        <Text variant="title" accessibilityRole="header">
          {t(recovery ? 'screens.auth.passwordUpdated' : 'screens.auth.checkYourEmail')}
        </Text>
        <Text muted>{t(recovery ? 'screens.auth.yourPasswordHasSuccessfullyReset' : 'screens.auth.weVeSentPasswordResetLink')}</Text>
        {recovery ? null : <Text muted>{t('screens.auth.ifYouDonTSeeIt')}</Text>}
        <Button testID="reset-back" variant="link" label={t(recovery ? 'screens.auth.continueMaxina' : 'screens.auth.backMaxina')} onPress={() => router.replace('/maxina' as never)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled" testID="reset-password">
      <Text variant="title" accessibilityRole="header">
        {t(recovery ? 'screens.auth.setNewPassword' : 'screens.auth.resetYourPassword')}
      </Text>
      <Text muted>{t(recovery ? 'screens.auth.chooseStrongPasswordForYourAccount' : 'screens.auth.enterYourEmailWeLlSend')}</Text>
      {recovery ? (
        <>
          <Field testID="reset-new-password" label={t('screens.auth.newPassword')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
          <Field
            testID="reset-confirm-password"
            label={t('screens.auth.confirmPassword')}
            placeholder={t('screens.auth.reenterYourPassword')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
          />
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
        />
      )}
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      <Button
        testID="reset-submit"
        label={t(recovery ? 'screens.auth.setNewPassword' : 'screens.auth.sendResetLink')}
        busyLabel={t(recovery ? 'screens.auth.updating' : 'screens.auth.sending')}
        busy={busy}
        onPress={() => void (recovery ? update() : request())}
      />
      <Button testID="reset-back" variant="link" label={t('screens.auth.backMaxina')} onPress={() => router.replace('/maxina' as never)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 32, gap: 12 },
});
