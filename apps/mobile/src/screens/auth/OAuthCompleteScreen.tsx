/**
 * VTID-05186 (N3, plan change 10) — the native `/oauth/complete` route: the
 * return of the browser PKCE flow (Android Apple, and N4's link fallback).
 * Exchanges `?code=` for a session, then the post-sign-in path.
 */
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { DelayedLoader, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { exchangeCode, postSignInTarget } from '../../auth/sign-in';
import { Button } from './form';
import { StyleSheet, View } from 'react-native';

export function OAuthCompleteScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ code?: string; redirectTo?: string }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const code = typeof params.code === 'string' ? params.code : null;
    if (!code) {
      setFailed(true);
      return;
    }
    void exchangeCode(code).then((r) => {
      if (r.ok) router.replace(postSignInTarget(typeof params.redirectTo === 'string' ? params.redirectTo : null) as never);
      else setFailed(true);
    });
  }, [params.code, params.redirectTo]);
  if (!failed) return <DelayedLoader accessibilityLabel={t('screens.portals.signingYou')} />;
  return (
    <View style={styles.root} testID="oauth-failed">
      <Text>{t('screens.portals.tryAppleSigninAgain')}</Text>
      <Button testID="oauth-back" variant="link" label={t('screens.portals.backLogin')} onPress={() => router.replace('/maxina' as never)} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, gap: 12 } });
