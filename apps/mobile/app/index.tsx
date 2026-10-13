/**
 * VTID-05186 (N3, plan change 14) — `/`: the landing redirect
 * (useSmartRouting.tsx:102-110): signed in → `/home` (News), signed out →
 * `/maxina`. Listed in the parity ledger's `native_only` (the web `/` is
 * PUBLIC.LANDING, a public-auth lane screen).
 */
import { Redirect } from 'expo-router';
import { DelayedLoader } from '../src/ports/ui';
import { useAuth } from '../src/auth/AuthProvider';
import { useI18n } from '../src/i18n/I18nProvider';

export default function Landing() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <DelayedLoader accessibilityLabel={t('common.loading')} />;
  return <Redirect href={user ? '/home' : '/maxina'} />;
}
