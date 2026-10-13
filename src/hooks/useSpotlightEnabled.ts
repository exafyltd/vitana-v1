import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTenantFeatureFlag } from '@/hooks/useTenantFeatureFlag';

/**
 * VTID-05105 — is the Spotlight desktop design on for this viewer?
 *
 *   enabled = !isMobile && (previewOverride ?? tenantFlag)
 *
 * - Tenant flag: tenant_settings.feature_flags.desktop_spotlight (admin
 *   Settings → Feature Flags).
 * - Preview override: `?spotlight=1` / `?spotlight=0` on any URL stores
 *   localStorage `vitana.spotlight`; an explicit override wins over the tenant
 *   flag in both directions, so staging can review with the flag off and
 *   anyone can opt out. `?spotlight=clear` removes it.
 * - Phones (< 1024 px) never get Spotlight — mobile layouts are unchanged.
 */
export const SPOTLIGHT_FLAG = 'desktop_spotlight';
export const SPOTLIGHT_STORAGE_KEY = 'vitana.spotlight';

export type SpotlightOverride = boolean | null;

export function readSpotlightOverride(): SpotlightOverride {
  try {
    const v = window.localStorage.getItem(SPOTLIGHT_STORAGE_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    // storage blocked (private mode, previews) — no override
  }
  return null;
}

/** Applies `?spotlight=` from a search string; returns the resulting override. */
export function applySpotlightQuery(search: string): SpotlightOverride {
  const param = new URLSearchParams(search).get('spotlight');
  try {
    if (param === '1' || param === '0') window.localStorage.setItem(SPOTLIGHT_STORAGE_KEY, param);
    else if (param === 'clear') window.localStorage.removeItem(SPOTLIGHT_STORAGE_KEY);
  } catch {
    // storage blocked — fall through to whatever can be read
  }
  if (param === '1') return true;
  if (param === '0') return false;
  return readSpotlightOverride();
}

export function resolveSpotlight(isMobile: boolean, override: SpotlightOverride, tenantFlag: boolean): boolean {
  if (isMobile) return false;
  return override ?? tenantFlag;
}

export function useSpotlightEnabled(): boolean {
  const isMobile = useIsMobile();
  const tenantFlag = useTenantFeatureFlag(SPOTLIGHT_FLAG);
  const { search } = useLocation();
  const [override, setOverride] = useState<SpotlightOverride>(() => applySpotlightQuery(search));
  useEffect(() => {
    setOverride(applySpotlightQuery(search));
  }, [search]);
  return resolveSpotlight(isMobile, override, tenantFlag);
}
