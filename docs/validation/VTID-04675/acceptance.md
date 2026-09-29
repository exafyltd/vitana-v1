# VTID-04675 — Admin › Notifications rebuilt

Owner request (2026-09-26): the four admin notification screens "just don't make sense"; the admin must switch every notification on or off, one by one, and new ones must not reach anyone until switched on. Backend: `exafyltd/vitana-platform` VTID-04674.

## Acceptance criteria
AC-1: one tab bar (Notifications / Categories / Activity / Send). The duplicate route set, the per-page SubNavigation and the empty Templates / Subscriptions / Providers pages are gone. Old URLs redirect.
  UI: docs/validation/VTID-04675/outputs/admin-notifications-desktop.png
AC-2: every notification type is listed, grouped by who receives it (members / admins / developers / staff) and by area, each with its switch, readiness, member category and 7-day counts.
  TEST: src/components/admin/notifications/NotificationControlsTab.test.tsx
AC-3: switching asks for confirmation, names who it reaches (about N people), takes an optional reason, and records it in the history.
  TEST: src/components/admin/notifications/NotificationControlsTab.test.tsx
  UI: docs/validation/VTID-04675/outputs/admin-notifications-confirm.png
AC-4: a type whose text is English only cannot be switched on.
  TEST: src/components/admin/notifications/NotificationControlsTab.test.tsx
AC-5: each automation that sends a type has its own switch.
  TEST: src/components/admin/notifications/NotificationControlsTab.test.tsx
AC-6: numbers that cannot be read show an error, never 0; a failed load shows the error.
  TEST: src/components/admin/notifications/NotificationControlsTab.test.tsx
AC-7: Categories: the types in each category show their on/off state; the admin can mark a category members may not switch off; a live preview shows exactly what members see (active + at least one switched-on type).
  TEST: src/lib/notifications/category-visibility.test.ts
  UI: docs/validation/VTID-04675/outputs/admin-categories-desktop.png
AC-8: Activity: real per-type and per-day counts (created, pushed, read, held by the switch, switched off by the member) for 7 / 30 / 90 days.
  UI: docs/validation/VTID-04675/outputs/admin-activity-desktop.png
AC-9: Send uses the admin's own tenant (it sent to a hard-coded all-zero tenant id before).
  TEST: src/components/admin/notifications/NotificationControlsTab.test.tsx
AC-10: on staging the rebuilt screen is in the deployed build.
  TEST: tests/e2e/staging/vtid-04676-notification-settings.staging.spec.ts

## How the screenshots were taken
There was a local harness: the real page components, with only the data layer stubbed (tenant, API client, auth). The data came from a fixture built by the real gateway `listNotificationControls` over rows read from the live database on 2026-09-28: 126 types, 13 switched on, and real 7-day and daily counts. Nothing was written anywhere. Desktop 1400×900 and mobile 390×844 were both captured, with no console errors and no horizontal overflow.
