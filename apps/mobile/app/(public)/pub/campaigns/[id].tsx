/** VTID-05646 (native-wave2-sharing-business-r3/sharing) — `/pub/campaigns/:id`, the public campaign landing; outside (app)/ so it needs no sign-in (App.tsx:860). */
import { useLocalSearchParams } from 'expo-router';
import { PublicCampaignScreen } from '../../../../src/screens/sharing/PublicCampaignScreen';

export default function PublicCampaignRoute() {
  const { id, utm_source, utm_medium, utm_campaign } = useLocalSearchParams<{ id: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>();
  const utm = Object.entries({ utm_source, utm_medium, utm_campaign })
    .filter(([, v]) => typeof v === 'string' && v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join('&');
  return <PublicCampaignScreen id={String(id ?? '')} utm={utm || undefined} />;
}
