/**
 * VTID-05186 (N3, plan change 16) — src/pages/Logout.tsx: sign out (local
 * scope, caches cleared by the AuthProvider) and land on the Maxina portal.
 *
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * mobile-web status while it runs: the spinner and "Signing out..."
 * (`screens.logout.signingOut`), centred.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Spinner, Text } from '../../ports/ui';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';

export function LogoutScreen() {
  const { signOut } = useAuth();
  const { t } = useI18n();
  useEffect(() => {
    let active = true;
    void signOut().finally(() => {
      if (active) router.replace('/maxina' as never);
    });
    return () => {
      active = false;
    };
  }, [signOut]);
  return (
    <View style={styles.root} testID="logout">
      <Spinner accessibilityLabel={t('screens.logout.signingOut')} />
      <Text muted>{t('screens.logout.signingOut')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 } });
