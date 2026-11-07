/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — "Is this your test?",
 * the native twin of src/components/patient/PartnerLinkRequestsCard.tsx
 * (VTID-05056). One entry per pending partner proposal (test, partner,
 * proposed date) with Confirm / Not me. Confirm asks once more in the
 * responsive dialog (a bottom sheet on a phone) before
 * `POST /partner-health/member/link-requests/:id/confirm`; Not me sends
 * `…/decline` straight away. Toasts as the web (`notify` on success,
 * `notifyError` on failure); both buttons disabled while a decision is in
 * flight. Renders nothing while loading, without requests or on failure —
 * it never blocks Results.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, CardContent, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import {
  PatientIcon,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '../../ports/patient-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useConfirmPartnerLink, useDeclinePartnerLink, usePartnerLinkRequests } from './data/hooks';
import type { PartnerLinkRequest } from './data/requests';
import { formatShortDate } from './format';

export function PartnerLinkRequestsCard(): ReactElement | null {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { data: requests, isError } = usePartnerLinkRequests();
  const confirm = useConfirmPartnerLink();
  const decline = useDeclinePartnerLink();
  const [confirming, setConfirming] = useState<PartnerLinkRequest | null>(null);

  if (isError || !requests || requests.length === 0) return null;

  const busy = confirm.isPending || decline.isPending;
  const partnerLabel = (r: PartnerLinkRequest) => r.partner_display_name || t('screens.patient.results.linkRequests.unknownPartner');

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
      <Card testID="partner-link-requests">
        <CardContent style={styles.content}>
          <View style={styles.intro}>
            <Text size="lg" weight="600" accessibilityRole="header">
              {t('screens.patient.results.linkRequests.title')}
            </Text>
            <Text size="sm" muted>
              {t('screens.patient.results.linkRequests.body')}
            </Text>
          </View>
          <View style={styles.list}>
            {requests.map((r) => (
              <View key={r.id} testID={`partner-link-request-${r.id}`} style={[styles.item, { borderColor: colors.border }]}>
                <View style={styles.itemText}>
                  <PatientIcon name="FlaskConical" size={20} color={colors.mutedForeground} />
                  <View style={styles.shrink}>
                    <Text weight="500">{r.test_name}</Text>
                    <Text size="sm" muted>
                      {partnerLabel(r)}
                    </Text>
                    {r.proposed_at ? (
                      <Text size="xs" muted>
                        {t('screens.patient.results.linkRequests.proposedOn', { date: formatShortDate(r.proposed_at, locale) })}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.actions}>
                  <Button testID={`partner-link-confirm-${r.id}`} size="sm" disabled={busy} onPress={() => setConfirming(r)}>
                    {t('screens.patient.results.linkRequests.confirm')}
                  </Button>
                  <Button testID={`partner-link-decline-${r.id}`} size="sm" variant="outline" disabled={busy} onPress={() => onDecline(r)}>
                    {t('screens.patient.results.linkRequests.decline')}
                  </Button>
                </View>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      <ResponsiveDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <ResponsiveDialogContent testID="partner-link-confirm-dialog">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('screens.patient.results.linkRequests.confirmDialogTitle')}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {confirming ? t('screens.patient.results.linkRequests.confirmDialogBody', { partner: partnerLabel(confirming), test: confirming.test_name }) : null}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button testID="partner-link-confirm-cancel" variant="outline" disabled={confirm.isPending} onPress={() => setConfirming(null)}>
              {t('screens.patient.results.linkRequests.cancel')}
            </Button>
            <Button testID="partner-link-confirm-action" disabled={confirm.isPending} onPress={onConfirm}>
              {t('screens.patient.results.linkRequests.confirmDialogAction')}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 16 },
  intro: { gap: 4 },
  list: { gap: 12 },
  item: { gap: 12, borderRadius: 8, borderWidth: 1, padding: 12 },
  itemText: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  shrink: { flexShrink: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 8 },
});
