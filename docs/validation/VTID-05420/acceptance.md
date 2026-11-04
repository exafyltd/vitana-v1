# VTID-05420 — spotlight-card-proportion / layout-core: acceptance

Plan: `exafyltd/vitana-platform` `.kiro/specs/spotlight-card-proportion/plan.md` + `tasks.md` (lane `layout-core`),
converged and policy-approved (`converged-auto-v1`). Owner approval of the layout: 2026-10-31, *"very good. yes, this
you can build"* (session `kiro-202610152203-0347`).

| Acceptance item | Evidence |
|---|---|
| `SpotlightGrid` with the exact props and DOM contract (`[data-spotlight-grid] > [data-slot=spotlight\|tiles\|row]`) | `src/components/layout/spotlight/SpotlightGrid.tsx`; `spotlight-grid.test.tsx` (8 cases) |
| Proportion: `xl` 5 columns, spotlight `col-span-2 row-span-2` (40%); `lg` 4 columns, spotlight `col-span-2 row-span-3` (50%) | `spotlight-grid.test.tsx` "places the spotlight at 2 of 5 columns…" |
| D4: >6 tiles truncated; 3 tiles → 3 rendered, spotlight keeps `col-span-2`, row span 1 (xl) / 2 (lg); 0 tiles → `empty` in the tile area, spotlight not widened; empty row not rendered | `spotlight-grid.test.tsx` |
| `ScreenFrame layout="spotlight-grid"` → `data-width="full"`, `data-screen-layout="spotlight-grid"`, chrome unchanged; default unchanged | `spotlight.vtid-05105.test.tsx` (2 new cases) |
| `VCard spotlightLabel` (spotlight only): text label, `ring-1 ring-primary`, token gradient art without `src`; off by default | `VCard.test.tsx` (3 new cases) |
| Skeleton: `ArchetypeSkeleton` / `SpotlightLoading` `layout="spotlight-grid"` → 1 spotlight + 6 standard + 5 compact; defaults and mobile shape unchanged | `spotlight.vtid-05105.test.tsx`, `SpotlightLoading.test.tsx` (2 new cases each) |
| i18n: 20 `spotlight.grid.*` keys, DE first (du-form), EN and the other 9 locales; stamps added for the new keys only | `src/i18n/*/spotlight.json`, `i18n-source-stamps/*.json` (+20 each, 0 lost); `i18n-stamp-source.mjs --check-all` 0 drift |
| RTL: logical properties only | `spotlight-grid.test.tsx` and `VCard.test.tsx` physical-class assertions |
| Contract text: new rule (numbered **SR-31**, see below), SR-11 / SR-13 / SR-14 / §A / §D / §F edits | `docs/design-system/SPOTLIGHT_RULES.md` |
| No new token, archetype or ESLint rule; `.claude/rules/design.md`, `index.css`, `tailwind.config.ts`, the manifest untouched | diff |
| Staging proof | Not verified on staging: the layout is opt-in and unused until a page lane lands (`staging-tests.json`, `kind: existing`) |

Decisions:
- The plan names the new rule "SR-26 Spotlight grid", but SR-26 to SR-30 already exist in `SPOTLIGHT_RULES.md`
  (SR-26 = "Every control has a handler"). Renumbering existing rules would break their references, so the new rule
  is **SR-31**; the rule text says so.
- `docs/SCREEN_INVENTORY.md` is not regenerated in this lane: on Windows the generator writes backslash paths and a
  different order (see `scope.json`). No key added here is consumed by a page.
