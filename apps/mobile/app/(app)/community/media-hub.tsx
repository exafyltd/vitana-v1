/**
 * VTID-05677 — `/community/media-hub`, the legacy web path that redirects to
 * `/comm/media-hub` (`src/App.tsx:1321`), query kept (`?tab=`, `?short=`).
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CommunityMediaHubRedirect() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value);
    else if (Array.isArray(value) && value.length) query.set(key, value[0]);
  }
  const qs = query.toString();
  return <Redirect href={(qs ? `/comm/media-hub?${qs}` : '/comm/media-hub') as never} />;
}
