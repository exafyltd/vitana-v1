/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the sharing screens' door to
 * `@vitana/core`: the campaign distribution templates and channel facts the web campaign dialog
 * reads (`src/lib/campaign-templates.ts`, class A, pure data). Screen files import these only
 * from here (tests/ports.test.ts); the class-B Supabase hooks are re-implemented natively under
 * `src/screens/sharing/data`.
 */
export { DISTRIBUTION_TEMPLATES, CHANNEL_BEST_TIMES, CHANNEL_INFO, MANUAL_SHARE_CHANNELS } from '@vitana/core/campaign-templates';
export type { DistributionTemplate } from '@vitana/core/campaign-templates';
