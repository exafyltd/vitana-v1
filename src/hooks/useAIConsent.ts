import { useState, useCallback, useEffect } from 'react';
import { useUserPreferences } from './useUserPreferences';

const CONSENT_KEY = 'vitana_ai_consent_given';

export function useAIConsent() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localConsent, setLocalConsent] = useState<boolean>(() => {
    try { return localStorage.getItem(CONSENT_KEY) === 'true'; } catch { return false; }
  });

  // Consent is granted if EITHER localStorage or Supabase says so
  const hasConsent = localConsent || preferences?.ai_data_consent_given === true;

  // Sync localStorage when Supabase preferences load
  useEffect(() => {
    if (preferences?.ai_data_consent_given === true) {
      try { localStorage.setItem(CONSENT_KEY, 'true'); } catch {}
      setLocalConsent(true);
    } else if (preferences?.ai_data_consent_given === false) {
      try { localStorage.removeItem(CONSENT_KEY); } catch {}
      setLocalConsent(false);
    }
  }, [preferences?.ai_data_consent_given]);

  const showConsentDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const grantConsent = useCallback(() => {
    // Save to localStorage immediately (always works)
    try { localStorage.setItem(CONSENT_KEY, 'true'); } catch {}
    setLocalConsent(true);
    setDialogOpen(false);

    // Also persist to Supabase (may fail if not authenticated)
    updatePreferences({
      ai_data_consent_given: true,
      ai_data_consent_date: new Date().toISOString(),
    });
  }, [updatePreferences]);

  const revokeConsent = useCallback(() => {
    try { localStorage.removeItem(CONSENT_KEY); } catch {}
    setLocalConsent(false);

    updatePreferences({
      ai_data_consent_given: false,
      ai_data_consent_date: null as any,
    });
  }, [updatePreferences]);

  return {
    hasConsent,
    isLoading,
    dialogOpen,
    setDialogOpen,
    showConsentDialog,
    grantConsent,
    revokeConsent,
  };
}
