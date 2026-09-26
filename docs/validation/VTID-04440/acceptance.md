# VTID-04440 — imported contacts, usable on the phone

I checked whether members can actually use the contacts that Connected Apps
imports (Google, iCloud, Android). On a phone, they could not.

1. **The mobile inbox had no Contacts section.**
   - The mobile pills were All / Direct / Groups.
   - The contacts list, and with it every imported contact, existed only on the
     desktop tab.
2. **"Find friends" in Contacts and Invite Friends said "coming soon" for
   Google and iCloud**, even though Connected Apps now imports both.
3. **The phone-book path in "Find friends" wrote contacts from the browser.**
   - It matched members against `profiles` by phone and e-mail.
   - That lookup did not exclude test and service accounts (CLAUDE.md rule 45).
   - It bypassed the hub's de-duplication.
4. **The consent card promised "Your raw contact information never leaves your
   device".** That is false: contacts are stored in the member's account on
   the server.
   - Its keys existed in no shard, so the card showed English in every
     language.
5. **Other screens in this flow were English-only.**
   - The error screens, the source tiles and the progress text were hard-coded
     in English.
   - The row's "Invite" button was hard-coded too.
6. **On a 390px phone the rows were clipped.** The Message button and delete
   icon were cut off, and so was the header's "Find friends" button.

## What changed

- **Mobile inbox:** a fourth pill, "Contacts", shows the same list as the
  desktop tab.
- **`useContactSync`:** every source now goes through the hub.
  - **Google / iCloud:** if the app is on in Connected Apps, it syncs now.
    If it is off, a "connect first" step leads to Connected Apps.
  - **Phone book:** the Contact Picker result goes to the hub's device import.
  - **Preview:** built by reading back the rows for those sources. Nothing is
    written from the browser.
  - **WhatsApp** is no longer offered, because it has no import path.
- **Consent card:** rewritten with accurate statements. Contacts are stored in
  the member's account, visible only to them, and removable in Connected Apps.
  E-mail addresses are compared to show who is already on Vitanaland.
- **Translations:** the tiles, progress text, error screens and connect step
  all use `mailhub.findFriends.*`. There are 32 new keys, German first in
  du-form, in all eleven locales.
- **Contact rows on phones:**
  - Actions are icon-only, 40px tap targets with accessible labels.
  - The "On Vitana" badge is icon-only.
  - The header buttons sit in two equal columns.
  - Margins use logical properties, so the layout mirrors in right-to-left.
  - The row's debug `console.log` is removed.

## Acceptance criteria

AC-1: Find friends offers Google, iCloud and the phone book (not WhatsApp), and marks the ones already on.
TEST: src/components/contacts/ContactSyncModal.test.tsx › offers Google, iCloud and the phone book

AC-2: Google on → syncs through the hub; the preview is read back from the imported rows; nothing is written from the browser.
TEST: src/components/contacts/ContactSyncModal.test.tsx › Google on: syncs through the hub

AC-3: iCloud off → a connect step that leads to Connected Apps.
TEST: src/components/contacts/ContactSyncModal.test.tsx › iCloud off

AC-4: Phone book → the picked contacts go to the hub's device import; picking nothing shows a translated screen.
TEST: src/components/contacts/ContactSyncModal.test.tsx › phone book

AC-5: The consent card is translated and does not claim contacts stay on the device.
TEST: src/components/contacts/ContactSyncModal.test.tsx › consent

AC-6: The new strings exist in all eleven locales with the same keys and placeholders.
TEST: src/components/contacts/ContactSyncModal.test.tsx › findFriends strings

AC-7: Checked visually against a stubbed hub and fixture contacts, with every remote write aborted.
- **Views:** mobile in German, desktop in English, and mobile in Arabic (right-to-left).
- **Screens covered:**
  - Contacts on the phone;
  - the consent card;
  - the source picker;
  - the "connect first" step.
- There is no horizontal scroll, and the rows fit a 390px screen.
- **Screenshots:** `outputs/*.png`. **Harness:** `outputs/verify-find-friends.cjs`.

`useContactSync.error-logging.test.ts` is removed, because the client-side matching code it pinned no longer exists.

Not verified end to end: no real Google, iCloud or Android import was run. Importing as the test account would write to production, which is forbidden.
