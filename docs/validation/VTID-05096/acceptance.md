# VTID-05096 — verify your phone number (community app)

Part B of the sparred plan in `plan-sparring.md` (Part A, the gateway routes, SMS and migration, is VTID-05095 in exafyltd/vitana-platform, PR #4056).

## What changed
- **Settings → Privacy:** a "Your phone number" card above the existing discoverability switch. Unverified: one line of explanation and **Verify number**. Verified: the masked number (`+49 ••• 567`, always LTR) with **Change** and **Remove** (Remove asks first).
- **Verify dialog** (`VerifyPhoneDialog`, a modal — no route, no screen-registry entry): mobile number (prefilled from the number typed into the profile, only as a suggestion; region hint from the device language) → **Send code** → 6-digit code field (`inputmode=numeric`, `autocomplete=one-time-code`, so iPhone and Android offer the code from the SMS) → **Verify** → done. Resend after the gateway's timer (60 s), "Different number", and a message for every gateway error code.
- **Find friends:** in the results, one line "Verify your number so friends can find you" with **Verify now**, only while the member is unverified.
- **Hidden while off:** every entry point reads `GET /api/v1/me/phone`; while the gateway switch `PHONE_VERIFY_ENABLED` is off (it ships off) or the call fails, nothing renders. Members see no change until the owner switches it on.
- Strings: `mailhub.findFriends.verifyPhone.*` (22 + 12 error messages) in all eleven locales, German du-form; stamps re-stamped.

## Evidence
- Vitest: `src/components/contacts/VerifyPhoneDialog.test.tsx` (31 tests) and `ContactSyncModal.test.tsx` (18, the status hook mocked off); contacts / settings / lib / i18n / settings pages: 104 files, 864 tests pass.
- Screenshots from a local harness with a stubbed gateway (`screenshots/`): card unverified and verified, number step, code step with a wrong-code error — German phone 390×844 and desktop 1400×900, Arabic RTL phone. No horizontal overflow in any of them; the masked number reads `+49 ••• 567` left to right inside the RTL card.
- Staging (read-only): `tests/e2e/staging/vtid-05096-verify-phone.staging.spec.ts`.

## Not done here
- No What's New entry: the feature ships behind the gateway switch (owner rule: nothing behind a flag). The entry comes with the change that switches it on.

## Acceptance criteria

AC-1 Nothing of phone verification renders while the gateway switch is off or the status call fails.
TEST: src/components/contacts/VerifyPhoneDialog.test.tsx — "are hidden while the gateway switch is off, and when the status call fails"; tests/e2e/staging/vtid-05096-verify-phone.staging.spec.ts

AC-2 The dialog sends the number, then the 6-digit code; the code field offers one-time-code autofill; resend waits for the timer.
TEST: src/components/contacts/VerifyPhoneDialog.test.tsx — "number → code → done…", "the resend button waits for the timer"

AC-3 Every gateway error code shows its own message; unknown codes fall back to a generic one.
TEST: src/components/contacts/VerifyPhoneDialog.test.tsx — "send error …", "confirm error …", "an unknown or missing error code…"

AC-4 Verified: masked number (LTR in RTL), Change, Remove after confirmation; unverified: Verify and the Find friends hint.
TEST: src/components/contacts/VerifyPhoneDialog.test.tsx — "PhoneNumberCard and VerifyPhoneHint"

AC-5 Every new string exists in all eleven locales; German is du-form.
TEST: src/components/contacts/VerifyPhoneDialog.test.tsx — "i18n"

## Fix forward — mobile Settings → Privacy (STAGING-VERIFY run 38284505767)
STAGING-VERIFY on b9891fa5 failed the VTID-05096 spec: on a phone, `/settings/privacy` redirects to `MobileSettings` (`/settings?mode=privacy`), whose visibility section is a fixed list of switches — so neither the new phone number card nor VTID-05058's discoverability switch was on the screen phone members see, and `GET /api/v1/me/phone` was never requested. `MobileSettings` privacy.visibility now renders `PhoneNumberCard` and `PhoneDiscoverabilityToggle` (both hide themselves when unavailable).

AC-6 On a phone, Settings → Privacy shows the phone number card and the discoverability switch.
TEST: src/pages/__tests__/mobile-settings-privacy-phone.vtid-05096.test.tsx (fails without the fix, passes with it); tests/e2e/staging/vtid-05096-verify-phone.staging.spec.ts
