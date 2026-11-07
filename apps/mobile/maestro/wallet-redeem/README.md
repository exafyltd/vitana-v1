# Maestro — wallet-redeem lane (VTID-05423) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native voucher-redeem port (`/redeem?voucher=<code>`,
`apps/mobile/app/(public)/redeem.tsx`). These flows are **not run in CI** and are
**not a merge blocker** (tasks.md wallet-redeem task 5). They need the isolated G1
test environment. Recorded here and in `docs/validation/VTID-05423/staging-tests.json`.

Parity reference: the phone branch of `src/pages/RedeemVoucher.tsx` against the
390×844 **read-only** staging web `/redeem` (no voucher is claimed on staging).

Flows (to author on G1):

- `01-redeem-signed-out.yaml` — signed out, open a G1 fixture redeem link: the
  landing (gift, voucher card, "Sign in to redeem" / "Create account" →
  `/maxina?redirectTo=…`); `/redeem` with no code (Invalid link), an unknown code
  (Voucher not found), an expired fixture (Voucher expired).
- `02-redeem-signed-in.yaml` — **G1 environment only, never a live system**: sign
  in, open a G1 fixture voucher, the confirm screen, claim it, "Voucher claimed!",
  then reopen the link (Already redeemed).

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/wallet-redeem/` (fake Supabase client, built requests asserted)
and the typecheck / bundle / deps / parity gates.
