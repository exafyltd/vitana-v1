# VTID-04449 / VTID-04450: Outlook Contacts in the app; Apple sign-in text is accurate again

Backend: exafyltd/vitana-platform#3642.

## Acceptance criteria

AC-1 Connected Apps lists Outlook Contacts in the Contacts section, between Google Contacts and iPhone Contacts, on phone and desktop. When it is on, the row shows the account, the number of imported contacts and "Sync now".
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx
UI: docs/validation/VTID-04449/outputs/mobile-de-1-outlook-contacts-row.png

AC-2 "Find friends" offers Outlook as a fourth source and marks it when it is on. Picking it syncs `outlook-contacts` through the hub and reads back the rows where `source = 'microsoft'`. Nothing is written from the browser.
TEST: src/components/contacts/ContactSyncModal.test.tsx
UI: docs/validation/VTID-04449/outputs/mobile-de-3-find-friends-sources.png

AC-3 The Outlook Contacts name and description exist in all 11 locales.
TEST: src/components/contacts/ContactSyncModal.test.tsx

AC-4 (VTID-04450) The Apple sign-in dialog no longer says the password is "only used to read". It names reading, sending mail when asked, and the "Vitanaland" calendar. The Apple Mail description mentions sending. Updated in all 11 locales (du / ti / tú / você forms, register check clean).
UI: docs/validation/VTID-04449/outputs/mobile-de-2-apple-dialog.png

## How it was checked

`verify-outlook-contacts.cjs` runs against the local dev server with the hub
API stubbed. Every non-GET request to a remote host is aborted. Viewports:
390×844 (German and Arabic, RTL) and 1400×900 (English). There is no
horizontal scroll on any of them.
