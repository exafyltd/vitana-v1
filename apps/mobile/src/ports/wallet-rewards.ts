/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the N2 kit parts the
 * rewards shop needs beyond src/ports/ui.tsx (the web RewardShop / EarnMore
 * use shadcn Checkbox and Progress, and `notifySuccess` for the redeemed
 * toast). Plain re-exports through one port, so screen files never import
 * `@vitana/ui` directly (tests/ports.test.ts).
 */
export { Checkbox, Progress, notifySuccess } from '@vitana/ui';
export type { CheckedState } from '@vitana/ui';
