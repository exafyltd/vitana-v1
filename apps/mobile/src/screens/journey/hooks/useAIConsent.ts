/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — native twin of
 * `src/hooks/useAIConsent.ts`: consent is granted when the device flag
 * (`vitana_ai_consent_given`, AsyncStorage instead of localStorage) OR the
 * member's `user_preferences.ai_data_consent_given` says so; granting writes
 * both (the preferences row with the consent date).
 */
import { useCallback, useEffect, useState } from 'react';
import { deviceStorage } from '../../../identity/device-storage';
import { useUserPreferences } from '../data/supabase';

export const CONSENT_KEY = 'vitana_ai_consent_given';

export function useAIConsent() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localConsent, setLocalConsent] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve(deviceStorage.getItem(CONSENT_KEY)).then((v: string | null) => {
      if (active && v === 'true') setLocalConsent(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const hasConsent = localConsent || preferences?.ai_data_consent_given === true;

  useEffect(() => {
    if (preferences?.ai_data_consent_given === true) {
      void deviceStorage.setItem(CONSENT_KEY, 'true');
      setLocalConsent(true);
    } else if (preferences?.ai_data_consent_given === false) {
      void deviceStorage.removeItem(CONSENT_KEY);
      setLocalConsent(false);
    }
  }, [preferences?.ai_data_consent_given]);

  const grantConsent = useCallback(() => {
    void deviceStorage.setItem(CONSENT_KEY, 'true');
    setLocalConsent(true);
    setDialogOpen(false);
    updatePreferences({ ai_data_consent_given: true, ai_data_consent_date: new Date().toISOString() });
  }, [updatePreferences]);

  return { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent };
}
