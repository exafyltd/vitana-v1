/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — what the
 * three confirm screens (`/auth/confirmed`, `/maxina/confirmed`,
 * `/alkalma/confirmed`) read, ported from the web hooks they use:
 *
 * - `confirmationState` — src/hooks/useEmailConfirmation.ts: the `error` /
 *   `error_description` the confirmation link carried (delivered as route
 *   params by link-bridge.ts), else "signed in or not". The web shows raw
 *   English sentences; native maps the same four cases to catalog keys.
 * - `roleRedirectUrl` — `useRoleBasedRedirect().getRedirectUrl`
 *   (src/hooks/useSmartRouting.tsx:235-254) with `isMobile` true; the
 *   community landing is `@vitana/core`'s `communityLandingPath`.
 * - `fetchWelcomeDiscount` — src/hooks/useDiscountCode.ts: the member's newest
 *   unused, unexpired `user_discount_codes` row for the tenant (a read).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { communityLandingPath, type TenantRegistry, type UserRole } from '../ports/core';
import { getSupabase } from './client';

export type ConfirmationState = { kind: 'confirmed' } | { kind: 'error'; messageKey: string };

/** Catalog keys for the useEmailConfirmation.ts error sentences. */
export const CONFIRMATION_ERROR_KEYS = {
  cancelled: 'authPortalsNative.confirm.errors.cancelledOrExpired',
  expired: 'authPortalsNative.confirm.errors.linkExpired',
  generic: 'authPortalsNative.confirm.errors.generic',
  signIn: 'authPortalsNative.confirm.errors.signInToContinue',
} as const;

export function confirmationState(params: { error?: string | null; error_description?: string | null }, signedIn: boolean): ConfirmationState {
  const error = params.error ?? null;
  if (error) {
    if (error === 'access_denied') return { kind: 'error', messageKey: CONFIRMATION_ERROR_KEYS.cancelled };
    if (params.error_description?.includes('Email link is invalid or has expired')) return { kind: 'error', messageKey: CONFIRMATION_ERROR_KEYS.expired };
    return { kind: 'error', messageKey: CONFIRMATION_ERROR_KEYS.generic };
  }
  return signedIn ? { kind: 'confirmed' } : { kind: 'error', messageKey: CONFIRMATION_ERROR_KEYS.signIn };
}

/** useSmartRouting.tsx getRedirectUrl, phone branch. */
export function roleRedirectUrl(dbRole: UserRole, tenantSlug: string | null | undefined, registry: TenantRegistry): string {
  switch (dbRole) {
    case 'admin':
    case 'staff':
      return '/admin';
    case 'backoffice':
      return '/home';
    case 'professional':
      return '/professional/dashboard';
    case 'patient':
      return '/patient/dashboard';
    case 'community':
    default:
      return tenantSlug ? communityLandingPath(tenantSlug, registry) : '/home';
  }
}

export type WelcomeDiscount = { id: string; code: string; discount_percent: number; valid_for: string; tenant_slug: string; expires_at: string };

export async function fetchWelcomeDiscount(tenantSlug: string, userId: string, now: Date = new Date(), supabase: SupabaseClient = getSupabase()): Promise<WelcomeDiscount | null> {
  const { data, error } = await supabase
    .from('user_discount_codes')
    .select('id, code, discount_percent, valid_for, tenant_slug, expires_at, used_at, created_at')
    .eq('user_id', userId)
    .eq('tenant_slug', tenantSlug)
    .is('used_at', null)
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as WelcomeDiscount | null) ?? null;
}
