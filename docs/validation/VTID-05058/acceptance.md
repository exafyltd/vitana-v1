# VTID-05058 — one-tap "Find friends from my contacts" + real invites

Part B of the sparred plan in `plan-sparring.md` (Part A, phone matching on the gateway, is VTID-05057 in exafyltd/vitana-platform, PR #4007).

## What a member sees
1. **Find friends** (Messages → Contacts, the empty Contacts list, and `/invite`) opens one flow. Consent once, then **one tap**:
   - native app shell (`window.vitanaNative.contacts.getAll()`, for the planned native app) → every contact, no picker;
   - Chrome on Android → the phone's contact picker ("select all");
   - everywhere else — iPhone, the Appilix store app's WebView, desktop — **"Choose a contacts file (.vcf)"** with the export steps for iPhone and Android.
   Google / Outlook / iCloud sit underneath as one-tap rows (connect step if off, as before).
2. Results like a messenger: **On Vitanaland** with **Message** (opens `/inbox/u/<id>`), everyone else with **Invite** → WhatsApp / SMS / e-mail / share, with the member's personal `/i/<code>` link in the text. Vitanaland sends nothing itself; the contact shows "Invited" only after the channel opened.
3. Contacts tab: real Invite on every non-member row (was: a date stamp and an "Invite sent" toast while nothing was sent), "Remove contacts imported from my phone" (gateway DELETE).
4. `/invite`: the personal link (copy / share) plus the same Contacts list. The old page's "Send invites" said "N invites sent!" in English and sent nothing — removed.
5. Settings → Privacy: "Findable by my phone number" (`profiles.discoverable_by_phone`), hidden until the VTID-05057 migration adds the column.

## Also fixed (plan F3/F4/F6)
- `useContacts.addContact` no longer matches a typed number against `profiles.phone` in the browser; it asks `check_phone_on_platform` (verified + discoverable only after VTID-05057). Hardcoded English toasts → catalog.
- Avatar fallback is one query instead of one per member; debug `console.log`s with contact data removed; the realtime refetch is debounced (an import writes hundreds of rows).
- Contacts list: rows no longer overflow on a phone (Radix viewport `display:table`), and flip in Arabic (Radix defaults to LTR); numbers render LTR inside RTL text.
- Removed `InviteComposer.tsx` (its Send was a `console.log`) and `SyncSuccessScreen.tsx` (replaced by the results step).

## Evidence
- Vitest: full suite 322 files / 2,047 tests passed; after the final UI fixes the contacts/hooks/navigation/i18n subset 67 files / 329 tests passed. New: `src/lib/vcard.test.ts`, `src/lib/contact-invite-links.test.ts`, VTID-05058 cases in `ContactSyncModal.test.tsx`.
- `tsc`: no errors in changed files (project total 184 vs 185 on base). ESLint: 0 errors in changed files (pre-existing `any`s in `useContacts.ts` unchanged). `npm run build` passes.
- Screenshots (`screenshots/`, local harness with stubbed data — no network, no production): 390×844 and 1400×900, German and Arabic (RTL), no horizontal overflow, invite menu open.
- Strings: 47 new/updated `mailhub.findFriends.*` keys, German first (du-form), all eleven locales; `npm run i18n:inventory` regenerated.

## Decisions taken
- No What's New entry in this PR: phone matching only lights up after the Gate 2 migration and members verifying a number; the post-merge drafter can still propose one.
- `.vcf` only for the file path (not CSV) — that is what phone Contacts apps export.
- `InviteComposer` / `SyncSuccessScreen` deleted rather than left as dead code (the composer's Send was fake).
