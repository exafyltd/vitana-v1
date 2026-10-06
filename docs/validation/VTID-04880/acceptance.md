# VTID-04880 — the language gate stops counting the retired Navigator table

Companion to exafyltd/vitana-platform VTID-04880, which archives the legacy
voice navigator's `nav_catalog*` tables into `legacy_archive`. The voice
navigator reads this repo's screen registry (`src/navigation/registry/`) since
VTID-04846, so that is where its translations are checked.

## Change (scripts only, nothing deploys)

- `scripts/i18n-parity-gate.mjs` (`npm run i18n:gate`), surface 6:
  - **6a Navigation, from files, no DB needed:** every target picker locale has
    a title for every screen in `screens.json`. `de` and `en` are read inline;
    the others from `locales/<code>.json`.
  - **6b My Journey (DB):** the count of complete topics (every translatable
    field filled), compared with the `en` reference. `de` (the source) and `en`
    are excluded, the same rule as `ci_vital_systems_health()`. It replaces
    `rows > 0`.
- `scripts/check-locale-registry.mjs`: comments and one message no longer
  name the Navigator table. The check itself is unchanged.

## Acceptance criteria

AC-1: with no service role, the gate gives a navigation verdict from the files
  for every locale (all pass today) and reports My Journey as UNKNOWN. It does
  not crash.
TEST: node scripts/i18n-parity-gate.mjs --all --report-only

AC-2: a single missing registry title fails that locale. Mutation test: blank
  `fr` AI.COMPANION gives "FAIL navigation 1/185 screen title(s) missing".

AC-3: the checklist filter is valid PostgREST syntax (read-only GET: HTTP 200,
  no parse error). Read-only SQL on production on 2026-10-05: every non-source
  locale has 260/260 complete topics, so the stricter check passes today.

AC-4: `node scripts/check-locale-registry.mjs --report-only` still reports OK.
