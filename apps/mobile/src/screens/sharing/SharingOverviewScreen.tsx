/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the mobile-web Sharing
 * overview (`src/pages/Sharing.tsx`, non-Spotlight branch): the blast center, the channel connector,
 * the growth KPIs, the automation queue and the performance analytics, with "New campaign" opening
 * the campaign sheet. The web's sample "Wellness Workshop" autopilot nudge and the social-share
 * autopilot moments are fixed sample content with buttons that only log; they are not ported.
 */
import { useState, type ReactElement } from 'react';
import { Text, Button } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Page } from './components';
import { CampaignSheet } from './CampaignSheet';
import { AnalyticsPanel, BlastCenter, ChannelConnector, GrowthKpis, ScheduledQueue } from './OverviewParts';

export function SharingOverviewScreen(): ReactElement {
  const { t } = useI18n();
  const [campaignOpen, setCampaignOpen] = useState(false);
  return (
    <>
      <Page
        title={t('screens.sharing.distributionSharing')}
        description={t('sharingNative.overview.description')}
        testID="sharing-screen"
        actions={
          <Button size="sm" onPress={() => setCampaignOpen(true)} testID="sharing-new-campaign">
            {t('screens.sharing.newCampaign')}
          </Button>
        }
      >
        <BlastCenter />
        <ChannelConnector />
        <GrowthKpis />
        <ScheduledQueue />
        <Text variant="title" accessibilityRole="header">
          {t('screens.sharing.performanceAnalytics')}
        </Text>
        <AnalyticsPanel />
      </Page>
      <CampaignSheet open={campaignOpen} onClose={() => setCampaignOpen(false)} />
    </>
  );
}
