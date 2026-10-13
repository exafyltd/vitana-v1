/**
 * VTID-05093 (Health Hub D10, WP2) — a Settings › Privacy switch bound to one
 * whole-category health consent (e.g. `health_data_analytics`).
 *
 * The switch is controlled by the member's real consent record: on only when
 * the gateway returns an active row, off otherwise (never on by default).
 * Turning it on opens HealthConsentDialog to grant; turning it off opens the
 * same dialog on the "withdraw?" confirmation. While the consents load, fail,
 * the store is pending (VTID-05092 migration not applied) or the wording is
 * still a draft, the switch stays off and disabled with a short note — but an
 * active consent can always be switched off.
 */
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { HealthConsentDialog } from '@/components/settings/HealthConsentDialog';
import { consentAvailability, useHealthConsents } from '@/hooks/useHealthConsents';
import type { HealthConsentCategoryKey } from '@/lib/health-consent-wording';
import { t, useI18nLocale } from '@/lib/i18n-toast';

const UI = 'screens.settings.healthConsentUi';

const NOTE_KEYS: Partial<Record<ReturnType<typeof consentAvailability>, string>> = {
  store_pending: 'storePendingShort',
  draft: 'draftPendingShort',
  unknown_category: 'unavailableShort',
  unavailable: 'unavailableShort',
};

interface HealthConsentSwitchProps {
  category: HealthConsentCategoryKey;
  labelKey: string;
  descriptionKey: string;
}

export function HealthConsentSwitch({ category, labelKey, descriptionKey }: HealthConsentSwitchProps) {
  const appLocale = useI18nLocale();
  const consents = useHealthConsents();
  const [dialog, setDialog] = useState<null | 'grant' | 'revoke'>(null);
  const availability = consentAvailability(consents.data, consents, category, null, appLocale);
  const checked = availability === 'active';
  const enabled = availability === 'active' || availability === 'grantable';
  const noteKey = NOTE_KEYS[availability];

  return (
    <>
      <div className="flex items-center justify-between gap-4" data-testid={`health-consent-row-${category}`}>
        <div className="min-w-0 text-start">
          <h4 className="font-medium">{t(labelKey)}</h4>
          <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
          {noteKey && (
            <p className="text-xs text-muted-foreground" data-testid={`health-consent-note-${category}`}>
              {t(`${UI}.${noteKey}`)}
            </p>
          )}
        </div>
        <Switch
          checked={checked}
          disabled={!enabled}
          aria-label={t(labelKey)}
          onCheckedChange={(on) => setDialog(on ? 'grant' : 'revoke')}
        />
      </div>
      <HealthConsentDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        category={category}
        grantedVia="settings_privacy"
        startWithRevoke={dialog === 'revoke'}
      />
    </>
  );
}

export default HealthConsentSwitch;
