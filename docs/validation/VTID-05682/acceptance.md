# VTID-05682 — native-wave1-readiness-tests/deeplinks-i18n: acceptance

**Readiness statement.** These tests are readiness evidence only. They do not prove the Wave 1 exit ("signed-in G1 member
navigates the full shell in all modes, receives a push and opens its deep link, on both platforms", `NATIVE-APP-PLAN.md:196`),
which needs G1 (`NATIVE-APP-PLAN.md` §5, §2a). Skipped cases are not counted toward the exit, and neither are the passing ones.

Spec: `exafyltd/vitana-platform` plan PR #4938 (still open), `.kiro/specs/native-wave1-readiness-tests/`, lane `deeplinks-i18n`.
Checked base: `e31bf4627ff3c705c20f8e6b718ce4dd03353b7f` (vitana-v1 `origin/main`).

## Cases added (new files only, `apps/mobile/tests/wave1-readiness/deeplinks-i18n/`)
| Task | File | Cases | Pass | Skip |
|---|---|---|---|---|
| L1 | `link-hosts.test.ts` | 13 | 10 | 3 |
| L2 | `link-routing-session.test.tsx` | 7 | 7 | 0 |
| L3 | `catalog-parity.test.ts` | 44 | 44 | 0 |
| L4 | `de-du-form.test.ts` | 3 | 3 | 0 |
| L5 | `rtl-locales.test.tsx` | 65 | 65 | 0 |
| — | `catalog-utils.ts` (helper, not a test file) | — | — | — |
| **Total** | 5 suites | **132** | **129** | **3** |

Full `apps/mobile` suite with the lane: 206 suites, 5753 tests, 5750 passed, 3 skipped (the lane's), 0 failed.
Before the lane (base): 201 suites. Red on base: `npx jest tests/wave1-readiness/deeplinks-i18n` on `origin/main` finds 0 tests (exit 1).

- L1: `configuredLinkHosts` with `expo-constants` mocked: no config / no `extra.linkHosts` / non-array (string, object, number, null) → `[]`; mixed array → strings only. Router: configured host resolves and navigates, unconfigured host navigates home, look-alike host (`host.evil.example`) navigates home.
- L2: `useLinkRouting` holds a route while signed out, replays it after `setSession`, latest target wins, sign-out replays nothing, signed-in link pushed at once, foreign link opens home; unmount detaches the navigator and the session subscription.
- L3: over `catalogs` / `SHARD_FILES`, for the 10 non-`de` locales: same shard file set as `de`; every `de` key present; every `{placeholder}` of the `de` value present in the same key; no empty value in any of the 11 locales (scoped, see F1).
- L4: no formal-address word in composed `de` (scoped, see F2); du-form words are present.
- L5: all 11 locales: `I18nProvider initialLocale` sets locale and `rtl` (`ar` true, others false, equal to `isRTL`); `t()` resolves `common.loading`; `languageFromLocale`/`localeFromLanguage` round-trip; `LanguageProvider` requests `I18nManager.forceRTL(true)` only for `ar` (I18nManager spied in the file); unknown locale falls back to `de`; `localeFromDevice` (`expo-localization` mocked) returns the first shipped device language, else `de`; `I18nProvider` without `initialLocale` starts from the device locale.

## Skipped, needs G1 (NOT counted toward the Wave 1 exit)
All in `link-hosts.test.ts`, each with `// needs G1 (isolated test backend): <reason>` above it:
1. `a universal link on the real associated domain opens the app` — the web host does not exist before G1 (`src/linking/link-router.ts:88`).
2. `apple-app-site-association and assetlinks.json are served and verified` — needs a real host and OS verification.
3. `a deep link opened on a signed-in G1 member lands on its screen` — needs a signed-in G1 member, a device and a real gateway.

## Findings (source differs from the contract; recorded, not asserted, not fixed)
- **F1 — two empty `tr` values.** `src/i18n/tr/` has `screens.profile.dancePreferences` = `""` and `screens.sharing.stressLevels` = `""` (`de`: "💃 Tanzvorlieben", "Stresslevel"; `en`: "💃 Dance preferences", "Stress Levels"). A "no empty value" assertion would fail on main, so L3 asserts it for every other key and pins exactly these two for `tr` (a second test fails if the list goes stale). No catalog edit in this lane.
- **F2 — one formal-address string in `de`.** `screens.commerceportal.terms.agreeExplanation`: "… bestätigen Sie, dass Sie berechtigt sind …" (CLAUDE.md "Catalog quality": du-form, never Sie/Ihr/Ihnen). L4 excludes this key and nine others by key; the other nine are not formal address (third-person plural / "she" / plural-informal "ihr": `languageSettingControlsWhatLanguageText`, `matchReasonSharedPillar`, `archivedItemsHiddenFromRegularViews`, `theyWillRemovedFromYourList`, `theyLlReceive`, `theyReceive`, `thankYouForChoosingUseMaxina`, `support.voiceBody`, `theyLlNotifiedYourInterest`). A second test fails if any pinned key stops matching.
- **P1 — premise adjusted (task 0).** The plan says direction is set "through `isRTL`/`I18nManager`". On main `I18nProvider` sets `rtl` through `isRtlLanguage` (`src/i18n/I18nProvider.tsx`), and `I18nManager.forceRTL` is called by `LanguageProvider` (`src/identity/LanguageProvider.tsx:93`). L5 covers both; `isRTL` is asserted equal to the provider value. Also: `catalog-map.generated.ts` is gitignored and produced by `npm run gen:i18n` (run by `pretest`).

## Checklist (tasks.md lane `deeplinks-i18n`)
- [x] L1 link hosts · [x] L2 session replay · [x] L3 catalog parity (11 locales) · [x] L4 de du-form · [x] L5 RTL and locale resolution · [x] L6 G1 skips (3) · [x] L7 this folder
- [x] New test files only; no source, existing test, helper, i18n shard, `package.json` or lockfile change; `tests/settings/i18n-rtl.test.tsx` untouched
- [x] Mocks only, `tests/helpers/no-network` active, no production host, no fixture-gateway
- [x] `npm test` and `npm run typecheck` pass in `apps/mobile`
- Staging proof: not verified on staging: offline mock tests, nothing deployed.
