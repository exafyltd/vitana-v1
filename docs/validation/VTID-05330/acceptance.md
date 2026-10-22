# VTID-05330 — acceptance (profile-posts-full-width / card-layout)

Owner request 2026-10-22: on the profile Posts tab (phone), avatar + name on top and the post full width below it.
Plan: vitana-platform `.kiro/specs/profile-posts-full-width/` (converged, policy-approved). Base: vitana-v1
origin/main `60c18aee4`.

## Red → green
`src/components/profile/shared/tabs/ProfilePostsTab.layout.test.tsx` (committed before the fix):
- origin/main: **4 failed / 4** (no header/body split; image classes `mt-4 rounded-xl shadow-md`).
- this branch: **4 passed / 4**; `npx vitest run src/components/profile` 14 files / 81 tests passed.

## Checks (local, this branch)
- `npm run build` ✓ · `npm run test:design-contract` ✓ (fail 0).
- ESLint `ProfilePostsTab.tsx`: 15 errors, all pre-existing `design/no-raw-palette`, identical rule/message set to
  origin/main (no new error); test file and staging spec clean.

## Visual check (Playwright, local harness — real component, mocked data hooks, no live system)
Left/top edges in CSS px (`screenshots/`):

| viewport | | avatar | name | text | media (width) |
|---|---|---|---|---|---|
| 390×844 | main | 37 / 33 | 93 / 33 | 93 / 95 | 93 (260) |
| 390×844 | branch | 37 / 37 | 93 / 33 | **37** / 95 | **17 (356)** |
| 1400×900 | main | 341 / 53 | 397 / 53 | 397 / 87 | 397 (662) |
| 1400×900 | branch | 341 / 53 | 397 / 53 | 397 / 87 | 397 (662) |

Phone: text starts at the avatar's left edge, media spans the card (358 px card minus 1 px borders), avatar
vertically centred with the name. Desktop: identical to main.

## Staging
`staging-tests.json`: read-only spec `tests/e2e/staging/vtid-05330-profile-posts-full-width.staging.spec.ts`
(skips when the test user's profile shows no post). Never against production.
