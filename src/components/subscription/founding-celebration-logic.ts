/**
 * VTID-04859 · when the Founding 1000 celebration shows. Kept apart from the
 * component so it can be unit-tested and the component file stays
 * components-only (fast refresh).
 */
import type { FoundingMe } from '@/lib/billingApi';

export const foundingQueryKey = (userId: string | undefined) => ['billing', 'founding', 'me', userId ?? 'anon'] as const;

/** Screens where the celebration must not interrupt (onboarding finishes first). */
const SUPPRESSED_PREFIXES = ['/onboarding', '/_intro', '/auth', '/commerce', '/admin', '/dev', '/staff', '/command-hub'];

export function isFoundingCelebrationSuppressed(pathname: string): boolean {
  return SUPPRESSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function shouldCelebrate(data: FoundingMe | undefined): boolean {
  return !!data?.founding && !data.celebrated && typeof data.seat_number === 'number';
}
