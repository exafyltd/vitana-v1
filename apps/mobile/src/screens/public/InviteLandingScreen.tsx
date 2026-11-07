/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — `/i/:code`:
 * native twin of src/pages/InviteLanding.tsx. Remembers the friend's invite
 * code and hands over to the Maxina sign-up (Join) tab — `/maxina?tab=signup`
 * (VTID-04524: an invited friend is almost always new).
 *
 * The code is not re-parsed from a URL here: a system link is resolved by
 * `resolve-link.ts` (`/i/:code` → `{ kind: 'invite', code }`) and delivered by
 * `auth-port.ts` `deliverInviteLink`; this screen reads the delivered code via
 * `onInviteLink` (a cold-start link waits in the port until the handler
 * registers). In-app navigation to `/i/<code>` gives the code as the route
 * param. No request, no auth write.
 */
import { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { DelayedLoader } from '../../ports/ui';
import { onInviteLink } from '../../linking/auth-port';
import { useI18n } from '../../i18n/I18nProvider';
import { rememberInviteCode } from './invite';

export const INVITE_TARGET = '/maxina?tab=signup';

export function InviteLandingScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ code?: string }>();
  const routeCode = typeof params.code === 'string' ? params.code : '';
  const [handedOver, setHandedOver] = useState(false);

  useEffect(() => {
    let delivered: string | null = null;
    // A pending link is delivered synchronously on registration; a later one is remembered as it arrives.
    const off = onInviteLink((link) => {
      delivered = link.code;
      rememberInviteCode(link.code);
    });
    if (!delivered && routeCode) rememberInviteCode(routeCode);
    setHandedOver(true);
    return off;
  }, [routeCode]);

  if (!handedOver) return <DelayedLoader accessibilityLabel={t('common.loading')} />;
  return <Redirect href={INVITE_TARGET as never} />;
}
