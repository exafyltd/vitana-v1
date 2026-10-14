# VTID-05170 — acceptance (Life Timeline P4: the timeline screen)

Depends on the gateway API VTID-05169 (/api/v1/timeline) being live on staging before this merges.

AC-1 The Vitana Index leads the screen: score, tier, today's change, the five pillars as bars with today's change and
7-day momentum, the balance sentence (full score / "<pillar> is holding your balance back (−N %)"), and one action
for the weakest pillar (→ /health/vitana-index). No Index yet → an honest prompt, no invented numbers.
TEST: npx vitest run src/components/timeline -t "leads with the Vitana Index|no Index yet"

AC-2 Each day shows the Index change (from recorded movements), the "Your day" digest and the moments. A moment's
badge shows a number only when the gateway measured it ("+6 Hydration"); otherwise "Counts for <pillar>". No raw
JSON, no generic "Activity"/"View Details", no assistant telemetry.
TEST: npx vitest run src/components/timeline -t "measured influence"

AC-3 Pillar chips (All + five pillars + More → life categories) filter through the API; search and jump-to-date
are wired; empty and error states with retry.
TEST: npx vitest run src/components/timeline -t "pillar chips|empty and error"

AC-4 One readable detail (bottom sheet on phones, inline-end panel on desktop): when, facts, before → after per
pillar when measured, the sensitive-data note, "Vitana may learn from this" (hide from Vitana), Open, Delete with
confirmation.
TEST: npx vitest run src/components/timeline -t "readable detail"

AC-5 Spotlight contract: desktop renders ScreenFrame archetype "collection" behind the flag; phones render the same
body; the old 9 queries / 18 realtime channels, HorizontalCardList and raw Card are gone; manifest status
"migrated"; design/eslint baseline entries for the file removed (0 errors).
TEST: npx vitest run src/components/timeline -t "source contract|manifest"; npm run -s test:design-contract

AC-6 i18n: every catalog topic (80), category (19) and UI string in all 11 locales, DE first, du-form; stamps
refreshed; the parity gate shows no new failure versus main (17 pre-existing).
TEST: npx vitest run src/components/timeline -t "German and an English"; npm run -s i18n:gate

AC-7 Staging (read-only): phone and desktop render, Index leads, API answered, no sideways scroll in LTR/RTL, no
cryptic content, detail opens.
UI: tests/e2e/staging/vtid-05170-life-timeline.staging.spec.ts
