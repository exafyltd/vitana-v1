/**
 * VTID-05186 (N3, plan change 10) — after any successful sign-in on a portal:
 * `setTenantBySlug(<portal tenant>)` (switch_to_tenant_by_slug + refreshSession)
 * and then `/onboarding/welcome[?redirectTo=]` (MaxinaPortal.tsx:166-215). The
 * screen keeps its loader up until the switch resolves, so an Alkalma ID-token
 * sign-up does not flash Maxina; the web's 6 s hard deadline still applies.
 */
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { postSignInTarget, type PortalTenant } from '../../auth/sign-in';
import { useTenant } from '../../identity/TenantProvider';

/** MaxinaPortal.tsx "HARD DEADLINE: always navigate within 6s". */
export const POST_SIGN_IN_DEADLINE_MS = 6000;

export function usePostSignIn(tenant: PortalTenant, redirectTo: string | null | undefined): { redirecting: boolean } {
  const { user, loading } = useAuth();
  const { setTenantBySlug } = useTenant();
  const started = useRef(false);

  useEffect(() => {
    if (loading || !user || started.current) return;
    started.current = true;
    const target = postSignInTarget(redirectTo);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      router.replace(target as never);
    };
    const deadline = setTimeout(go, POST_SIGN_IN_DEADLINE_MS);
    void setTenantBySlug(tenant)
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(deadline);
        go();
      });
  }, [loading, user, tenant, redirectTo, setTenantBySlug]);

  return { redirecting: !!user };
}
