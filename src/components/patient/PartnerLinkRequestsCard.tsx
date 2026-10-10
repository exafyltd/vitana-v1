/**
 * VTID-05056 (Health Hub Phase 0 / D8) — "Is this your test?"
 *
 * Partner staff can only PROPOSE that an unmatched lab result belongs to a
 * member; the result reaches the member's orders, calendar and results only
 * after the member confirms here. One entry per pending request: partner,
 * test, the date it was proposed, and Confirm / Not me. Confirm asks once more
 * in a dialog that says what confirming does.
 *
 * Renders nothing while loading, when there are no requests, or when the
 * request fails (any gateway or migration state) — it never blocks Results.
 * RTL-safe: logical spacing and alignment only.
 */
import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import {
  usePartnerLinkRequests,
  useConfirmPartnerLink,
  useDeclinePartnerLink,
  type PartnerLinkRequest,
} from '@/hooks/usePartnerLinkRequests';
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';

function partnerLabel(r: PartnerLinkRequest): string {
  return r.partner_display_name || t('screens.patient.results.linkRequests.unknownPartner');
}

export function PartnerLinkRequestsCard() {
  const { data: requests, isError } = usePartnerLinkRequests();
  const confirm = useConfirmPartnerLink();
  const decline = useDeclinePartnerLink();
  const [confirming, setConfirming] = useState<PartnerLinkRequest | null>(null);

  if (isError || !requests || requests.length === 0) return null;

  const busy = confirm.isPending || decline.isPending;

  const onConfirm = () => {
    if (!confirming) return;
    confirm.mutate(confirming.id, {
      onSuccess: () => {
        notify('screens.patient.results.linkRequests.confirmed');
        setConfirming(null);
      },
      onError: () => notifyError('screens.patient.results.linkRequests.failed'),
    });
  };

  const onDecline = (r: PartnerLinkRequest) => {
    decline.mutate(r.id, {
      onSuccess: () => notify('screens.patient.results.linkRequests.declined'),
      onError: () => notifyError('screens.patient.results.linkRequests.failed'),
    });
  };

  return (
    <>
      <Card data-testid="partner-link-requests">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1 text-start">
            <h2 className="text-lg font-semibold">{t('screens.patient.results.linkRequests.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('screens.patient.results.linkRequests.body')}</p>
          </div>
          <ul className="space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                data-testid="partner-link-request"
                className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3 text-start">
                  <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium break-words">{r.test_name}</p>
                    <p className="text-sm text-muted-foreground break-words">{partnerLabel(r)}</p>
                    {r.proposed_at && (
                      <p className="text-xs text-muted-foreground">
                        {t('screens.patient.results.linkRequests.proposedOn', {
                          date: fmtDate(r.proposed_at, { day: 'numeric', month: 'short', year: 'numeric' }),
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" disabled={busy} onClick={() => setConfirming(r)}>
                    {t('screens.patient.results.linkRequests.confirm')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecline(r)}>
                    {t('screens.patient.results.linkRequests.decline')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ResponsiveDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('screens.patient.results.linkRequests.confirmDialogTitle')}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {confirming
                ? t('screens.patient.results.linkRequests.confirmDialogBody', {
                    partner: partnerLabel(confirming),
                    test: confirming.test_name,
                  })
                : null}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button variant="outline" disabled={confirm.isPending} onClick={() => setConfirming(null)}>
              {t('screens.patient.results.linkRequests.cancel')}
            </Button>
            <Button disabled={confirm.isPending} onClick={onConfirm}>
              {t('screens.patient.results.linkRequests.confirmDialogAction')}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

export default PartnerLinkRequestsCard;
