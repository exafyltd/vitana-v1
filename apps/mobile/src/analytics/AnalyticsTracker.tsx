/**
 * VTID-05648 — native twin of the web `AnalyticsTracker` (`src/components/AnalyticsTracker.tsx:60-70`). Renders
 * nothing. Feeds tenant / hashed-user / language into the analytics client and emits one `screen_viewed` journey
 * event per path change. The user id is SHA-256-hashed here before it reaches the client; if hashing fails the
 * member is tracked anonymously, the raw id never leaves the device.
 */
import { useEffect } from 'react';
import { usePathname, useGlobalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../auth/AuthProvider';
import { useTenant } from '../identity/TenantProvider';
import { useI18n } from '../i18n/I18nProvider';
import { noteRouteChange, setAnalyticsContext, track } from './client';

async function sha256Hex(value: string): Promise<string | null> {
  try {
    return (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value)) || null;
  } catch {
    return null;
  }
}

export function AnalyticsTracker(): null {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { locale } = useI18n();
  const searchPresent = Object.keys(params ?? {}).length > 0;

  useEffect(() => {
    setAnalyticsContext({ tenantId: activeTenantId ?? null, language: locale });
  }, [activeTenantId, locale]);

  const userId = user?.id;
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setAnalyticsContext({ userIdHash: null, consent: 'anonymous' });
      return;
    }
    void sha256Hex(userId).then((hash) => {
      if (cancelled) return;
      setAnalyticsContext(hash ? { userIdHash: hash, consent: 'granted' } : { userIdHash: null, consent: 'anonymous' });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const previous = noteRouteChange(pathname);
    if (previous === pathname) return;
    track('screen_viewed', { event_type: 'journey', properties: { previous_route: previous, search_present: searchPresent } });
    // search_present is read at the moment the path changes, as on web
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
