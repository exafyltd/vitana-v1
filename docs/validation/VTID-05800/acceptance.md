# VTID-05800 (vitana-v1 half) - anyone can allocate a VTID

Owner order, 2026-11-15 (Kiro Web session `kiro-exafy-202611132341-8c70`): *"remove all the rules that limit allocation
of vtid only through cicd available. allocating a vtid should be the easiest thing in the worls, manually possible,
single click possible, any way that you can imagine should make it possible for any machine any human with any process
to allocate a fresh vtid. check the codebase and remove every single rule that is preventing from that and wriote the
fix right away"*

The gateway, migration, CLI and tests are in the vitana-platform PR of VTID-05800
(`docs/validation/VTID-05800/acceptance.md` there). This PR carries the vitana-v1 copies of the rules and the one-click
workflow. It deploys nothing (no file under the community-app deploy paths), so it is done when merged with green checks.

## Acceptance

AC-1 The rule texts of this repository no longer limit VTID allocation to CI or forbid allocating one by hand:
`.claude/rules/collaboration.md` section 7a, `AGENTS.md`, `.kiro/steering/{vitana-pipeline,vitana-kiro-notes,vitana-owner-autonomy}.md`,
the plan-sparring skill and partner agent, and `apps/mobile/README.md`. Sparring still reviews a back-end or complex plan
before its code merges; it never comes before the VTID.
CHECK: `git grep` for the old wording returns nothing (commands.log).

AC-2 The PreToolUse hook `.claude/hooks/pretooluse-plan-sparring-reminder.sh` (it denied an allocation without a
sparring record) is deleted, with its `.claude/settings.json` entry; `settings.json` stays valid JSON.

AC-3 `.github/workflows/VTID-ALLOCATE.yml` allocates a VTID with one click (Actions, Run workflow): every input is
optional, no token is needed (the `GATEWAY_SERVICE_TOKEN` secret is sent when it exists, only to record who allocated),
it tries `vars.VTID_GATEWAY_URL` (default staging) and then production, and prints `VTID_RESULT=VTID-NNNNN`.
`source: self-healing` is refused, as on the gateway.

AC-4 The VTID wording of the shared rule files matches vitana-platform: `vitana-pipeline.md`, `vitana-kiro-notes.md`
and `plan-sparring-partner.md` are identical in both repos, and `AGENTS.md` got the same edit. The differences these
files already had on `main` (for example stop 3 of `vitana-owner-autonomy.md`, and parts of `collaboration.md` and the
plan-sparring skill) are left as they were; each repo's text was edited from its own `main`.
