# VTID-05172 — acceptance (Life Timeline P6: Memory section refresh)

Plan: docs/validation/VTID-05172/plan-sparring.md (copy of vitana-platform VTID-05167, plan hash 535ddb70…2b04).
Backend: VTID-05171 (`/api/v1/timeline/learning-prefs`, `/usage-data`, `/routines`).

AC-1 Memory overview leads with this week's Vitana Index story (score, tier, 7-day change, rising and slipping
pillars, balance in plain words, link into the timeline) or an honest prompt without an Index; no mock arrays,
no invented "last synced" time.
TEST: npx vitest run src/components/memory/learning -t "Index story|source contract"

AC-2 Routines Vitana noticed: one sentence per routine kind from kind + metadata in the member's language (never
the gateway's English strings); unknown or malformed metadata falls back to a neutral sentence; each can be forgotten.
TEST: npx vitest run src/components/memory/learning -t "routines"

AC-3 Permissions: one saved switch per life area (five pillars first, app usage last with its consequence), disabled
with an honest note until the gateway has them; usage-data count, JSON export, delete all only after confirming.
The former decorative switches and stock cards are gone.
TEST: npx vitest run src/components/memory/learning -t "learn from|usage data|source contract"

AC-4 A "Vitana noticed" timeline entry reads as one sentence about its pillar.
TEST: npx vitest run src/components/memory/learning -t "Vitana noticed"

AC-5 Spotlight: /memory and /memory/permissions are ScreenFrame "collection" on desktop, manifest migrated,
baseline entries removed (0 errors); phones keep the app layout; no sideways scroll LTR/RTL.
TEST: npx eslint <changed files>; outputs/visual-check.txt; staging spec
UI: outputs/screenshot-{mobile,desktop}-{full,rtl,delete-confirm}.png

AC-6 i18n: DE first, du-form, 11 locales, stamps refreshed (56 keys added per locale, 0 lost); gate unchanged vs main.
TEST: npm run -s i18n:gate (17 failing checks, same as main)
