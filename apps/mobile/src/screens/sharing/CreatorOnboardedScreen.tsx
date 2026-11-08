/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the Stripe-return page
 * (`src/pages/CreatorOnboarded.tsx`, VTID-01230): the creator payment status is read from the gateway
 * (`GET /api/v1/creators/status`) and refreshed on open. Fully onboarded (charges and payouts enabled):
 * the success state with its benefits and the two actions; otherwise the in-progress state with
 * "Refresh status" and "Go to settings". The route sits under the AuthGate like the web route.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Text, useUITheme } from '../../ports/ui';
import { gatewayGet } from '../../auth/gateway';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { CardSkeletons, Page, Panel } from './components';

interface CreatorStatus {
  stripe_account_id?: string | null;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

const BENEFITS = [
  ['screens.creatoronboarded.youKeep90', 'screens.creatoronboarded.earn90EveryPaidLiveRoom'],
  ['screens.creatoronboarded.instantAccess', 'screens.creatoronboarded.startCreatingPaidRoomsImmediately'],
  ['screens.creatoronboarded.directDeposits', 'screens.creatoronboarded.earningsDepositedDirectlyYourBankAccount'],
] as const;

export function CreatorOnboardedScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['creator', 'status'],
    queryFn: () => gatewayGet<CreatorStatus>('/creators/status'),
    retry: false,
  });
  const [refetching, setRefetching] = useState(false);

  const refresh = async () => {
    setRefetching(true);
    try {
      await refetch();
    } finally {
      setRefetching(false);
    }
  };
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once on open, like the web effect
  }, []);

  const loading = isLoading || refetching;
  const done = !!data?.charges_enabled && !!data?.payouts_enabled;

  if (loading) {
    return (
      <Page title={t('screens.creatoronboarded.checkingYourPaymentStatus')} description={t('screens.creatoronboarded.thisShouldOnlyTakeMoment')} testID="creator-screen">
        <CardSkeletons count={2} testID="creator-loading" />
      </Page>
    );
  }
  if (done) {
    return (
      <Page title={t('screens.creatoronboarded.value0PaymentSetupComplete', { value0: '✨' })} description={t('screens.creatoronboarded.youReAllSetStartEarning')} testID="creator-screen">
        <Panel testID="creator-complete">
          {BENEFITS.map(([title, body]) => (
            <View key={title} style={styles.benefit}>
              <Text weight="700">{t(title)}</Text>
              <Text size="sm" muted>
                {t(body)}
              </Text>
            </View>
          ))}
        </Panel>
        <View style={styles.actions}>
          <Button onPress={() => navigateToWebPath('/community')} testID="creator-first-room">
            {t('screens.creatoronboarded.createYourFirstPaidRoom')}
          </Button>
          <Button variant="outline" onPress={() => navigateToWebPath('/settings/billing')} testID="creator-payment-settings">
            {t('screens.creatoronboarded.viewPaymentSettings')}
          </Button>
        </View>
      </Page>
    );
  }
  return (
    <Page title={t('screens.creatoronboarded.setupProgress')} description={t('screens.creatoronboarded.yourPaymentSetupProcessedThisCan')} testID="creator-screen">
      <Panel title={t('screens.creatoronboarded.whatSNext')} testID="creator-pending">
        {(['stripeVerifyingYourAccountInformation', 'youLlReceiveEmailWhenSetup', 'thisUsuallyTakes510Minutes'] as const).map((k) => (
          <Text key={k} size="sm" style={{ color: colors.statusWarning }}>
            {t(`screens.creatoronboarded.${k}`)}
          </Text>
        ))}
      </Panel>
      <View style={styles.actions}>
        <Button variant="outline" onPress={() => void refresh()} testID="creator-refresh">
          {t('screens.creatoronboarded.refreshStatus')}
        </Button>
        <Button variant="secondary" onPress={() => navigateToWebPath('/settings/billing')} testID="creator-settings">
          {t('screens.creatoronboarded.goSettings')}
        </Button>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  benefit: { gap: 2 },
  actions: { gap: 8 },
});
