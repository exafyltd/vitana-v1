/**
 * VTID-05093 (Health Hub D10, WP2) — one health consent, granted or withdrawn.
 *
 * Takes a category (and, for `wearables` / `partner_results`, the connector
 * id or partner key). Grant shows the versioned consent wording, an explicit
 * confirmation checkbox that starts unticked, and a Grant button that stays
 * disabled until the box is ticked. It sends the catalogue's
 * `current_text_version` and the locale whose text was actually displayed
 * (`resolveConsentWording`). An active consent shows Withdraw, which asks for
 * confirmation first.
 *
 * Draft gate: when the wording for the current version is not released in
 * `src/i18n/health-consent-texts.lock.json`, the wording is not shown and
 * Grant stays disabled with a "coming soon" note. Withdrawing an active
 * consent never depends on the wording, the catalogue or `store_pending`.
 *
 * RTL-safe: logical alignment/spacing only.
 */
import { useEffect, useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  consentAvailability,
  findActiveConsent,
  healthConsentErrorKey,
  useGrantHealthConsent,
  useHealthConsents,
  useRevokeHealthConsent,
  type ConsentGrantedVia,
} from '@/hooks/useHealthConsents';
import {
  PER_RESOURCE_CATEGORIES,
  fillConsentText,
  resolveConsentWording,
  toConsentLocale,
  type HealthConsentCategoryKey,
} from '@/lib/health-consent-wording';
import { ensureCatalog, onCatalogLoaded } from '@/i18n';
import { notify, notifyError, t, useI18nLocale } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';

const UI = 'screens.settings.healthConsentUi';

export interface HealthConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: HealthConsentCategoryKey;
  /** Connector id (`wearables`) or partner key (`partner_results`). */
  resourceId?: string | null;
  /** Display name of the partner / connector, shown in the copy. */
  resourceName?: string | null;
  grantedVia?: ConsentGrantedVia;
  /** Open straight on the "withdraw?" confirmation (a switch turned off). */
  startWithRevoke?: boolean;
  onChanged?: (active: boolean) => void;
}

export function HealthConsentDialog({
  open,
  onOpenChange,
  category,
  resourceId,
  resourceName,
  grantedVia = 'settings_privacy',
  startWithRevoke = false,
  onChanged,
}: HealthConsentDialogProps) {
  const appLocale = useI18nLocale();
  const consents = useHealthConsents();
  const grant = useGrantHealthConsent();
  const revoke = useRevokeHealthConsent();
  const [ticked, setTicked] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [, setCatalogTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    setTicked(false);
    setConfirmingRevoke(startWithRevoke);
  }, [open, startWithRevoke]);

  // Released EN wording is the fallback for locales without released text;
  // make sure that catalogue is loaded so it can be displayed.
  useEffect(() => {
    if (!open) return;
    const off = onCatalogLoaded(() => setCatalogTick((n) => n + 1));
    void ensureCatalog('en-US');
    return () => {
      off();
    };
  }, [open]);

  const data = consents.data;
  const perResource = PER_RESOURCE_CATEGORIES.has(category);
  const active = findActiveConsent(data, category, resourceId);
  const availability = consentAvailability(data, consents, category, resourceId, appLocale);
  const catalogueEntry = data?.categories.find((c) => c.key === category);
  const wording =
    availability === 'grantable' && catalogueEntry
      ? resolveConsentWording(category, catalogueEntry.current_text_version, appLocale)
      : null;
  const released = wording && wording.status === 'released' ? wording : null;
  const params = { name: resourceName || resourceId || '' };
  const busy = grant.isPending || revoke.isPending;

  const title = released && !active
    ? fillConsentText(released.texts.title, params)
    : t(`${UI}.categories.${category}`, params);

  const close = () => onOpenChange(false);

  const onGrant = () => {
    if (!released || !catalogueEntry || !ticked) return;
    grant.mutate(
      {
        category,
        ...(perResource && resourceId ? { resource_id: resourceId } : {}),
        text_version: catalogueEntry.current_text_version,
        locale: released.locale,
        granted_via: grantedVia,
      },
      {
        onSuccess: () => {
          notify(`${UI}.grantedToast`);
          onChanged?.(true);
          close();
        },
        onError: (err) => notifyError(healthConsentErrorKey(err)),
      },
    );
  };

  const onRevoke = () => {
    revoke.mutate(
      {
        category,
        ...(perResource && resourceId ? { resource_id: resourceId } : {}),
        locale: toConsentLocale(appLocale),
      },
      {
        onSuccess: () => {
          notify(`${UI}.revokedToast`);
          onChanged?.(false);
          close();
        },
        onError: (err) => notifyError(healthConsentErrorKey(err)),
      },
    );
  };

  const note = (key: string) => (
    <p data-testid="health-consent-note" className="text-sm text-muted-foreground text-start">
      {t(`${UI}.${key}`)}
    </p>
  );

  let body: JSX.Element;
  if (active) {
    body = (
      <div className="space-y-2 text-start" data-testid="health-consent-active">
        {active.granted_at && (
          <p className="text-sm font-medium">
            {t(`${UI}.statusGranted`, { date: fmtDate(active.granted_at, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {confirmingRevoke ? t(`${UI}.revokeConfirmBody`) : t(`${UI}.activeBody`)}
        </p>
      </div>
    );
  } else if (availability === 'loading') {
    body = note('loading');
  } else if (availability === 'unavailable' || availability === 'unknown_category') {
    body = note('unavailable');
  } else if (availability === 'store_pending') {
    body = note('storePending');
  } else if (!released) {
    body = note('draftPending');
  } else {
    body = (
      <div className="space-y-4 text-start" data-testid="health-consent-wording">
        <p className="whitespace-pre-line text-sm">{fillConsentText(released.texts.body, params)}</p>
        {released.locale !== toConsentLocale(appLocale) && (
          <p className="text-xs text-muted-foreground">{t(`${UI}.displayedInFallback`)}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t(`${UI}.versionLabel`, { version: catalogueEntry?.current_text_version ?? '' })}
        </p>
        <div className="flex items-start gap-3">
          <Checkbox
            id="health-consent-confirm"
            data-testid="health-consent-checkbox"
            checked={ticked}
            onCheckedChange={(v) => setTicked(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="health-consent-confirm" className="text-sm leading-snug">
            {fillConsentText(released.texts.checkbox, params)}
          </label>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg" data-testid="health-consent-dialog">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{confirmingRevoke && active ? t(`${UI}.revokeConfirmTitle`) : title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t(`${UI}.dialogDescription`)}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>{body}</ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          {active ? (
            confirmingRevoke ? (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmingRevoke(false)}>
                  {t(`${UI}.cancel`)}
                </Button>
                <Button type="button" variant="destructive" disabled={busy} onClick={onRevoke}>
                  {t(`${UI}.revokeConfirmAction`)}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={close}>
                  {t(`${UI}.close`)}
                </Button>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => setConfirmingRevoke(true)}>
                  {t(`${UI}.revoke`)}
                </Button>
              </>
            )
          ) : (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={close}>
                {t(`${UI}.cancel`)}
              </Button>
              <Button type="button" disabled={!released || !ticked || busy} onClick={onGrant}>
                {t(`${UI}.grant`)}
              </Button>
            </>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export default HealthConsentDialog;
