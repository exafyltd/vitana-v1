# VTID-04676 — Settings › Notifications rebuilt for members

Owner request (2026-09-26): the member notification settings "must be wired" to what is really sent.

## Acceptance criteria
AC-1: members see only categories that hold at least one notification the admin has switched on. "Posts & reactions" and "Tips & updates from Vitana" now exist, so new posts, likes, comments and the daily tip can be switched off.
  TEST: tests/e2e/staging/vtid-04676-notification-settings.staging.spec.ts
AC-2: categories decide in-app AND push, so they stay switchable when push is off (they were greyed out before).
  TEST: src/pages/settings/SettingsNotifications.vtid-04676.test.tsx
  UI: docs/validation/VTID-04676/outputs/member-settings-desktop.png
AC-3: a category the admin marked "can't be switched off" shows as always on, cannot be switched off, and the gateway refuses the change.
  TEST: src/pages/settings/SettingsNotifications.vtid-04676.test.tsx
AC-4: admins, developers and staff see the notifications their role receives.
  TEST: src/pages/settings/SettingsNotifications.vtid-04676.test.tsx
  UI: docs/validation/VTID-04676/outputs/member-settings-admin-desktop.png
AC-5: setting quiet hours saves the device's timezone, so the gateway checks quiet hours in the member's own time. Before, every profile held 'UTC' and quiet hours ran one or two hours late in Germany.
  TEST: src/lib/notifications/device-timezone.test.ts
AC-6: the mobile settings screen follows the same rules: categories switchable with push off, locked categories, and the role section.
  UI: docs/validation/VTID-04676/outputs/member-settings-mobile.png

Existing member choices carry over: category preference rows are untouched. The legacy per-area columns are no longer read, and on 2026-09-26 no member had switched one off.
