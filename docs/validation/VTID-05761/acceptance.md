# VTID-05761 — acceptance (native-catalog-de-keys / de-keys)

Source: `.kiro/specs/native-catalog-de-keys/tasks.md` (section `de-keys`) and `lanes/de-keys.md`, plan PR `exafyltd/vitana-platform#4994`
(converged round 2, policy `converged-auto-v1`).

Change types: Tooling/docs (catalog data only; no UI code, no user-visible text changes).

| Criterion | Evidence |
|---|---|
| The three namespaces have the same raw key set in all 11 locales | `key-diff-before.txt` TOTAL_MISMATCHES=113 (all flag leaves); `key-diff-after.txt` TOTAL_MISMATCHES=0 |
| The exact-key tests pass as written | `green-after.txt`: 260 passed, 0 failed (settings, ai-assistants, ai-coach `i18n-rtl.test.tsx`); base `red-on-base.txt`: 25 failed |
| No test file edited | the diff touches only `src/i18n/*/{settingsNative,aiAssistantsNative,aiCoachNative}.json` and `docs/validation/VTID-05761/` |
| No value changed in any locale or in `de` | `commands.log` value check: 1410 non-flag leaves compared with base, 0 changed or missing |
| `de` unchanged | `de` shards are not in the diff (German keys already exist for every flagged path) |
| Every value non-empty | exact-key test second assertion (`none empty`) passes for all 10 locales |
| Typecheck passes | `npm run typecheck` (tsc --noEmit) exit 0 |
| Removed flags listed, with the owner-visible consequence | `key-diff-before.txt` lists all 113 flag leaves per locale and namespace; the 113 machine-translated values are accepted without a new human review (plan decision 3) |
| Placeholders unchanged | the ai-assistants and ai-coach placeholder assertions pass (`green-after.txt`) |
| Staging proof | not verified on staging: catalog data only; the proof is the three exact-key test files on the PR head |
| Contract | n/a: no API or boundary crossed |
| Accessibility, states, surfaces | n/a: no screen or state code is changed |
| Locales | 11 locales of the three namespaces; no new text in any locale |
