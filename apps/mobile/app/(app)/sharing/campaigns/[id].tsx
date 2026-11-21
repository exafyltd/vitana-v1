/** VTID-05646 (native-wave2-sharing-business-r3/sharing) — `/sharing/campaigns/:id` (SHARING.CAMPAIGN_DETAIL). */
import { useLocalSearchParams } from 'expo-router';
import { CampaignDetailScreen } from '../../../../src/screens/sharing/CampaignDetailScreen';

export default function CampaignDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CampaignDetailScreen id={String(id ?? '')} />;
}
