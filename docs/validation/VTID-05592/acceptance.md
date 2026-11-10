# VTID-05592 — Acceptance (pr-gate-policy-sparring-record / policy-approval-record-v1)

Scope: `evaluateSparringRecord` in `scripts/ci/pr-gate/lib.mjs` accepts a policy approval, plus its tests. Change types: Tooling/docs.

AC-1 — CONVERGED + "approved by policy `converged-auto-v1`" + plan hash passes (no problems).
  TEST: scripts/ci/pr-gate/__tests__/lib.test.mjs "CONVERGED + policy approval + plan hash passes".
AC-2 — Policy approval on an ESCALATED-only verdict is no approval.
  TEST: "policy approval on an ESCALATED-only verdict is no approval".
AC-3 — An unknown policy name is no approval.
  TEST: "an unknown policy name is no approval".
AC-4 — CONVERGED + policy approval without plan hash gives exactly ['no plan hash'].
  TEST: "without plan hash gives exactly no plan hash".
AC-5 — Neither form: the problem names both forms.
  TEST: "neither approval form names both forms in the problem".
AC-6 — The existing owner-approval test is unchanged and green.
  TEST: "sparring record needs verdict, owner approval and plan hash".
AC-7 — The five new cases fail on base.
  TEST: commands.log (RED section).

No UI, no user-visible string (UX acceptance n/a). No protected gate file touched. Deploys nothing; not verified on staging.
