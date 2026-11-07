/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — `/:tenantSlug`,
 * the community portal of any registry tenant (App.tsx:2337, VTID-05151).
 *
 * Expo Router ranks this one-segment route above the `(app)/[...path]`
 * resolver, so every one-segment path lands here first. A path the web routes
 * statically (any other ledger destination: `/settings`, `/wallet`, …) renders
 * exactly what the resolver route renders — AuthGate + the member / public
 * shell around the resolver — so nothing but tenant portals changes.
 */
import { AuthGate } from '../../src/shell/AuthGate';
import { MobileAppShell } from '../../src/shell/components/MobileAppShell';
import { PublicShell } from '../../src/shell/components/PublicShell';
import { TenantPortalScreen } from '../../src/screens/auth/TenantPortalScreen';
import Resolver from '../(app)/[...path]';

function ResolverFallback() {
  return (
    <AuthGate
      member={
        <MobileAppShell>
          <Resolver />
        </MobileAppShell>
      }
      guest={
        <PublicShell>
          <Resolver />
        </PublicShell>
      }
    />
  );
}

export default function TenantPortalRoute() {
  return <TenantPortalScreen fallback={<ResolverFallback />} />;
}
