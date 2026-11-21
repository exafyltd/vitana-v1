# VTID-05685 — acceptance (native-parity-test-gaps/route-tests)

- Change types: Tooling/docs (tests and evidence only)
- Outcome: CI fails if `/intents/mine` stops redirecting to `/comm/find-partner?view=posts`, or if `/comm/my-groups/:id` stops rendering the group detail for its id. Members see no change.
- States: group loaded; group not found (id not seeded); redirect target exact including the query string; redirect happens once and renders nothing.
- Surfaces: native route files `app/(app)/intents/mine.tsx` and `app/(app)/comm/my-groups/[id].tsx`; no screen, web or backend change.
- Locales: n/a: assertions use test ids and a seeded group name, no copy.
- Accessibility: n/a: no UI change.
- Contract: route files at e31bf4627 (`mine.tsx:7-11`, `[id].tsx:6-12`); ledger rows `INTENTS.MINE` and `/comm/my-groups/:id` read-only. Only the in-memory Supabase double; `tests/helpers/no-network` makes any fetch throw.
- Staging proof: not verified on staging: tests only, nothing deploys; the Jest tests are the proof.
- Scope: only `apps/mobile/tests/parity-gaps/**` and `docs/validation/VTID-05685/**` changed; ledger, resolver, source and existing tests untouched (`commands.log`, gates 1 and 2).
