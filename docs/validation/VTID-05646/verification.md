# VTID-05646 — native sharing / distribution port (native-wave2-sharing-business-r3/sharing)

## Routes ported (8 ledger rows, lane `sharing-business`, all `native`)
| Web destination | Native route file |
|---|---|
| `/sharing` | `apps/mobile/app/(app)/sharing/index.tsx` |
| `/sharing/campaigns` | `apps/mobile/app/(app)/sharing/campaigns/index.tsx` |
| `/sharing/campaigns/:id` | `apps/mobile/app/(app)/sharing/campaigns/[id].tsx` |
| `/sharing/distribution` | `apps/mobile/app/(app)/sharing/distribution.tsx` |
| `/sharing/data-consent` | `apps/mobile/app/(app)/sharing/data-consent.tsx` |
| `/invite` | `apps/mobile/app/(app)/invite.tsx` |
| `/creator/onboarded` | `apps/mobile/app/(app)/creator/onboarded.tsx` (under the AuthGate, like web `App.tsx:1108-1112`) |
| `/pub/campaigns/:id` | `apps/mobile/app/(public)/pub/campaigns/[id].tsx` (public, no session, like web `App.tsx:860`) |

## Decisions taken
1. Class-A only in `@vitana/core` (campaign templates re-export); channel connectors and campaign hooks are class B and re-implemented natively.
2. The web `html2canvas` share card is replaced by a native capture port (`src/ports/share-capture.ts`, `captureRef`); without a capture engine the sheet falls back to sharing the link only.
3. Share links use the build's web origin (`webBaseUrl`, else the gateway origin), never a hardcoded host: the env guard (`tests/env.test.ts`) blocks production host literals in `src/`. Non-production builds therefore produce relative links.
4. The "payment settings" button goes through `navigateToWebPath('/settings/billing')`, which the shell maps to `/settings?mode=billing`.
5. New strings live in `src/i18n/<locale>/sharingNative.json` (DE first, du-form, 11 locales, `pt` você-form, `sr` Latin).
6. Task 8 (Maestro / device parity) is G1, `next_actor: owner`; not run here.

## Evidence
See `commands.log` (red on base in `red-on-base.txt`).
