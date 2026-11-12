/**
 * VTID-05429 (Native Wave 2, profile lane) — the shared profile domain types
 * through one port, from `@vitana/core/types` (the web `src/types/profile.ts`,
 * type-only re-export, erased from the bundle). The profile screens and their
 * data layer read these only through this port, never from `@vitana/core`
 * directly (tests/ports.test.ts). The data hooks themselves are class B on the
 * web (they import the web Supabase client) and are re-implemented natively in
 * `src/screens/profile/data/` (plan decision 2 — no core extraction).
 */
export type { AccountFieldKey, AccountVisibility, FieldVisibility } from '@vitana/core/types';
