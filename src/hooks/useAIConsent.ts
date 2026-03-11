import { useState, useCallback } from 'react';
import { useUserPreferences } from './useUserPreferences';

export function useAIConsent() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasConsent = preferences?.ai_data_consent_given === true;

  const showConsentDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const grantConsent = useCallback(() => {
    updatePreferences({
      ai_data_consent_given: true,
      ai_data_consent_date: new Date().toISOString(),
    });
    setDialogOpen(false);
  }, [updatePreferences]);

  const revokeConsent = useCallback(() => {
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
