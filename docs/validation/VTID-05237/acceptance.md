# VTID-05237 — Commerce "Still needed": who finishes each step (frontend lane)

Plan `commerce-step-owner` (platform repo, CONVERGED, approved by policy `converged-auto-v1`). Sparring: `plan-sparring.md`.
Gateway dependency satisfied: VTID-05238 merged in exafyltd/vitana-platform #4562 (`814b585220`), STAGING-VERIFY passed.
This lane changes the supplier screen only; the gateway, Partner Terms and MCP offering types are untouched.

## Acceptance criteria

AC-1: "Still needed" groups open steps by the gateway's `owner`, in the order "Only you can do this", "Your AI assistant can do this", "Vitanaland is checking"; the existing step wording stays under each group.
  TEST: src/components/commerce/SetupHub.step-owner.vtid-05237.test.tsx ("three groups in order", "keeps the existing step wording")
  UI: tests/e2e/staging/vtid-05237-step-owner.staging.spec.ts (390x844 and 1280x900, read-only)
AC-2: The assistant group is shown only while the Commerce MCP is reachable; when it is not (or the check fails, or has not answered yet) its steps join "Only you can do this".
  TEST: src/components/commerce/SetupHub.step-owner.vtid-05237.test.tsx ("only while the Commerce MCP is reachable", "before the reachability answer", "a failing reachability check")
  UI: tests/e2e/staging/vtid-05237-step-owner.staging.spec.ts ("assistant steps fall back to the supplier group")
AC-3: `in_progress` steps are listed when the gateway gave them an owner; one without an owner is not listed.
  TEST: src/components/commerce/SetupHub.test.ts (openSteps / groupOpenSteps cases) + SetupHub.step-owner.vtid-05237.test.tsx ("in_progress step the gateway gave no owner")
AC-4: A checklist without `owner` renders as today's single list, with no reachability request; an unknown owner counts as the supplier; the screen never works ownership out itself.
  TEST: src/components/commerce/SetupHub.step-owner.vtid-05237.test.tsx ("an older gateway", "an owner the screen does not know", "shows nothing the screen worked out")
AC-5: No new field, step, dialog or button for the supplier; existing supplier links and actions stay; no box for a live business; the reachability request is made once per visit and only when an assistant step exists.
  TEST: src/components/commerce/SetupHub.step-owner.vtid-05237.test.tsx ("no open step", "a live business", "once per visit") + SetupHub.vtid-05136.test.tsx (unchanged, green)
AC-6: All four new strings exist in all 11 locales (de first, informal register, each locale's existing "AI assistant" term); no raw strings; RTL-safe.
  TEST: src/components/commerce/SetupHub.step-owner.vtid-05237.test.tsx ("strings exist in all 11 locales") + i18n checks in CI (PR-GATE) + docs/SCREEN_INVENTORY.md regenerated
AC-7: Nothing is written: no migration, no new route, staging tests are read-only.
  TEST: tests/e2e/staging/vtid-05237-step-owner.staging.spec.ts (writes aborted by staging-guard, recorded writes must be empty)

## UX acceptance (Commerce supplier screens)
- User steps: unchanged (no step, dialog or button added).
- Required fields: none added.
- Decisions: none added; the supplier now sees which open steps need them and which their AI assistant or Vitanaland handles.
- Asked although inferable: none.
- Next step always clear: yes. The assistant group tells the supplier what to say to their assistant.
- Friction: down. One list becomes up to three short labelled lists.
