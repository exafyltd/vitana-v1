/**
 * VTID-05186 (N3, plan change 10) — the native `/oauth/complete` route: the
 * return of the browser PKCE flow (Android Apple, and N4's link fallback).
 * Exchanges `?code=` for a session, then the post-sign-in path.
 *
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * mobile-web states of src/pages/auth/OAuthComplete.tsx: "Finishing sign-in…"
 * while the exchange runs; the error state ("Sign-in couldn't complete", the
 * reason, "Go back and try again" / "Return to Vitana") for a gateway
 * `?error=` / `error_detail`, a missing or refused code, or the web's 10 s
 * deadline. The web's success panel (system browser → app deep link) has no
 * native counterpart: the app is already open, so success goes straight to
 * `postSignInTarget` (the seam the onboarding lane lands on).
 */
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Spinner, Text, useUITheme } from '../../ports/ui';
import { AuthIcon } from '../../ports/auth';
import { useI18n } from '../../i18n/I18nProvider';
import { exchangeCode, postSignInTarget } from '../../auth/sign-in';
import { Button } from './form';

/** OAuthComplete.tsx "Sign-in is taking longer than expected" deadline. */
export const OAUTH_COMPLETE_TIMEOUT_MS = 10_000;

type Status = { kind: 'processing' } | { kind: 'error'; message: string };

export function OAuthCompleteScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ code?: string; redirectTo?: string; error?: string; error_detail?: string }>();
  const [status, setStatus] = useState<Status>({ kind: 'processing' });
  // The exchange runs once per return URL; a language change must not re-run it.
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const t = tRef.current;
    let cancelled = false;
    const fail = (message: string) => {
      if (!cancelled) setStatus({ kind: 'error', message });
    };
    const timer = setTimeout(() => fail(t('screens.portals.signinTakingLongerThanExpected')), OAUTH_COMPLETE_TIMEOUT_MS);
    const gatewayError = typeof params.error === 'string' ? params.error : null;
    if (gatewayError) {
      clearTimeout(timer);
      fail(typeof params.error_detail === 'string' && params.error_detail ? params.error_detail : gatewayError.replace(/_/g, ' '));
      return () => {
        cancelled = true;
      };
    }
    const code = typeof params.code === 'string' ? params.code : null;
    if (!code) {
      clearTimeout(timer);
      fail(t('screens.portals.tryAppleSigninAgain'));
      return () => {
        cancelled = true;
      };
    }
    void exchangeCode(code).then((r) => {
      clearTimeout(timer);
      if (cancelled) return;
      if (r.ok) router.replace(postSignInTarget(typeof params.redirectTo === 'string' ? params.redirectTo : null) as never);
      else fail(r.errorKey ? t(r.errorKey) : (r.message ?? t('screens.portals.somethingWentWrong')));
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [params.code, params.redirectTo, params.error, params.error_detail]);

  if (status.kind === 'processing') {
    return (
      <View style={styles.root} testID="oauth-processing">
        <Spinner accessibilityLabel={t('screens.auth.finishingSignin')} />
        <Text variant="title" accessibilityRole="header" style={styles.center}>
          {t('screens.auth.finishingSignin')}
        </Text>
        <Text muted style={styles.center}>
          {t('screens.auth.pleaseWaitMoment')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.root} testID="oauth-failed">
      <View style={styles.icon}>
        <AuthIcon name="XCircle" size={48} color={colors.destructive} />
      </View>
      <Text variant="title" accessibilityRole="header" style={styles.center}>
        {t('screens.auth.signinCouldnTComplete')}
      </Text>
      <Text muted style={styles.center} testID="oauth-error-message">
        {status.message}
      </Text>
      <Button testID="oauth-retry" variant="outline" label={t('screens.auth.goBackTryAgain')} onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/maxina' as never))} />
      <Button testID="oauth-back" variant="link" label={t('screens.auth.returnVitana')} onPress={() => router.replace('/maxina' as never)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  icon: { alignItems: 'center' },
  center: { textAlign: 'center' },
});
