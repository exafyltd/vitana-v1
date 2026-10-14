/**
 * VTID-05186 (N3, plan change 16) — src/pages/Logout.tsx: sign out (local
 * scope, caches cleared by the AuthProvider) and land on the Maxina portal.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import { DelayedLoader } from '../../ports/ui';
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
  return <DelayedLoader delayMs={0} accessibilityLabel={t('common.loading')} />;
}
