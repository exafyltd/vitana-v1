/**
 * VTID-05429 (Native Wave 2, profile lane) — the per-field visibility cycle
 * the web Account card (`useAccountVisibility.cycleVisibility`) and
 * `PrivacySettings.cycle` share: Private → Connections → Public, written as
 * ONE `profiles.account_visibility` UPDATE (web `setFieldVisibility`). The
 * request is built by `buildVisibilityUpdate` and asserted in tests on the
 * client double; no real write fires.
 */
import { notify, notifyError } from '../../ports/ui';
import type { AccountFieldKey } from '../../ports/profile';
import { buildVisibilityUpdate, NEXT_TIER, tierFor, useProfileUpdate, type MyProfile } from './data/profile';

export function useVisibilityCycle(
  profile: MyProfile | undefined,
  opts: { errorKey: string; announce?: (key: AccountFieldKey, next: ReturnType<typeof tierFor>) => { field: string; tier: string } | null },
) {
  const update = useProfileUpdate();
  const cycle = (key: AccountFieldKey) => {
    if (!profile) return;
    const next = NEXT_TIER[tierFor(profile.account.visibility, key)];
    update.mutate(buildVisibilityUpdate(profile.userId, profile.account.visibility, key, next), {
      onSuccess: () => {
        const params = opts.announce?.(key, next);
        if (params) notify('profileNative.privacy.tierChanged', undefined, params);
      },
      onError: () => notifyError(opts.errorKey),
    });
  };
  return { cycle, pending: update.isPending };
}
