/**
 * VTID-05093 (Health Hub D10, WP2) — "Manage connected sources".
 *
 * Replaces the single "Third-party integrations" switch on Settings › Privacy:
 * one global switch cannot express a per-partner Art. 9 consent, so this lists
 * one consent per lab partner (`partner_results`) and per wearable connector
 * (`wearables`), exactly as GET /api/v1/health/consents returns them. A
 * partner or connector the member still has an active consent for is listed
 * even if the gateway no longer offers it, so it can always be withdrawn.
 *
 * VTID-05166 (Health Hub Phase 1 / C3): also the Health Sync consents
 * (`sync_*` per phone store) and `self_logged_health`, once the gateway's
 * catalogue carries them, so consents granted in the native app can be
 * withdrawn here.
 *
 * RTL-safe: logical alignment/spacing only.
 */
import { useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { HealthConsentDialog } from '@/components/settings/HealthConsentDialog';
import {
  consentAvailability,
  listConsentSources,
  useHealthConsents,
  type ConsentGrantedVia,
  type ConsentSource,
} from '@/hooks/useHealthConsents';
import { HEALTH_SYNC_CONSENT_KEYS } from '@/lib/health-consent-wording';
import { t, useI18nLocale } from '@/lib/i18n-toast';

const UI = 'screens.settings.healthConsentUi';

interface HealthConsentSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grantedVia?: ConsentGrantedVia;
}

export function HealthConsentSourcesDialog({ open, onOpenChange, grantedVia = 'settings_privacy' }: HealthConsentSourcesDialogProps) {
  const appLocale = useI18nLocale();
  const consents = useHealthConsents();
  const [selected, setSelected] = useState<{ source: ConsentSource; revoke: boolean } | null>(null);
  const sources = listConsentSources(consents.data, (store) => t(`${UI}.phoneStores.${store}`));
  const rows = sources.map((source) => ({
    source,
    availability: consentAvailability(consents.data, consents, source.category, source.id, appLocale),
  }));

  let note: string | null = null;
  if (consents.isLoading) note = 'loading';
  else if (consents.isError || !consents.data) note = 'unavailable';
  else if (consents.data.store_pending) note = 'storePending';
  else if (rows.some((r) => r.availability === 'draft' || r.availability === 'unknown_category')) note = 'draftPending';

  // VTID-05166: Health Sync (`sync_*`) and self-logged rows are labelled by their category
  // ("Sleep data from Apple Health"); partner and wearable rows keep the source name.
  const rowLabel = (source: ConsentSource) =>
    source.category === 'partner_results' || source.category === 'wearables'
      ? source.name
      : t(`${UI}.categories.${source.category}`, { name: source.name });

  const section = (categories: readonly ConsentSource['category'][], headingKey: string, testId: string) => {
    const list = rows.filter((r) => categories.includes(r.source.category));
    if (list.length === 0) return null;
    return (
      <section className="space-y-2" data-testid={`health-consent-sources-${testId}`}>
        <h3 className="text-sm font-semibold text-start">{t(`${UI}.${headingKey}`)}</h3>
        <ul className="space-y-2">
          {list.map(({ source, availability }) => {
            const active = availability === 'active';
            return (
              <li
                key={`${source.category}:${source.id}`}
                data-testid="health-consent-source"
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 text-start">
                  <p className="font-medium break-words">{rowLabel(source)}</p>
                  <p className="text-xs text-muted-foreground">
                    {active ? t(`${UI}.statusActive`) : t(`${UI}.statusNotGranted`)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={active ? 'outline' : 'default'}
                  disabled={!active && availability !== 'grantable'}
                  onClick={() => setSelected({ source, revoke: active })}
                >
                  {active ? t(`${UI}.revoke`) : t(`${UI}.allow`)}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <>
      {/* One dialog at a time: the list steps aside while a consent is open and comes back after. */}
      <ResponsiveDialog open={open && selected === null} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-lg" data-testid="health-consent-sources-dialog">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t(`${UI}.manageSourcesTitle`)}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t(`${UI}.manageSourcesDescription`)}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <div className="space-y-4">
              {note && (
                <p className="text-sm text-muted-foreground text-start" data-testid="health-consent-sources-note">
                  {t(`${UI}.${note}`)}
                </p>
              )}
              {section(['partner_results'], 'partnersHeading', 'partner_results')}
              {section(['wearables'], 'devicesHeading', 'wearables')}
              {section(HEALTH_SYNC_CONSENT_KEYS, 'healthSyncHeading', 'health_sync')}
              {section(['self_logged_health'], 'selfLoggedHeading', 'self_logged_health')}
              {consents.data && sources.length === 0 && (
                <p className="text-sm text-muted-foreground text-start">{t(`${UI}.noSources`)}</p>
              )}
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <HealthConsentDialog
        open={open && selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        category={selected?.source.category ?? 'partner_results'}
        resourceId={selected?.source.id}
        resourceName={selected?.source.name || undefined}
        grantedVia={grantedVia}
        startWithRevoke={selected?.revoke ?? false}
      />
    </>
  );
}

export default HealthConsentSourcesDialog;
