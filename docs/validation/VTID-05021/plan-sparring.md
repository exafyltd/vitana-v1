# Plan sparring record — VTID-05021 (Maxina native iOS + Android app)

- Plan: `docs/programs/native-app/NATIVE-APP-PLAN.md` (revision r5)
- Final plan sha256 (text between the plan markers): `7ef16a9e89564203146b479286dfc7f33025c26587f7aa07fe0fb685521cc0a2`
- Sparring session id (plan_sparring_sessions, attested tier): `0ca86c9a-64c2-435e-9c83-05ba75ae09ad`
- Verdict: **CONVERGED** (2 rounds, then 2 rounds after the owner's Aurora correction)
- **Owner approval (Gate 1, Autonomy Contract VTID-04947):** "Yes to both plans" — 2026-10-10, Claude Code session, with the recommended decisions listed in the plan §8. Binding click: Command Hub `POST /api/v1/plans/spar/0ca86c9a-64c2-435e-9c83-05ba75ae09ad/approve` (pending).
- Program status: `exafyltd/vitana-platform` `docs/programs/health-hub/STATUS.md`

## Rounds

- Partner: `plan-sparring-partner` agent (read-only, Read/Grep/Glob), same partner across rounds
- Change class: standard · Rounds: 2 · Verdict: CONVERGED

## Round 1 — NOT CONVERGED
Verified premises: breakpoint 1024 TRUE; MobileAppShell TRUE; Firebase project lovable-vitana-vers1 TRUE; MOBILE_EXCLUDED_ROLES TRUE; screens.json 185 TRUE; assetlinks TRUE; isIAPRestricted ~18 files PARTIAL (20); 11 shipped locales FALSE per CLAUDE.md; bottom nav TRUE; ORB external widget TRUE.
- F1 [blocker] No isolated test environment; production writes unavoidable during beta → ACCEPTED (hard gate G1)
- F2 [major] packages/core extraction unphased and high-risk → ACCEPTED (re-export layer first, phased, sized)
- F3 [major] ORB native undersized as a 3-week spike → ACCEPTED (own workstream 1b)
- F4 [major] Firebase project on decommissioned GCP project → ACCEPTED (hard gate G2, own VTID)
- F5 [major] Visual parity does not prove functional parity → ACCEPTED (per-screen-type checklist, lane exit criterion)
- F6 [major] Store/signing ownership unconfirmed → ACCEPTED (hard gate G3 + contingency)
- F7 [major] Locale count contradicts CLAUDE.md → REJECTED with evidence (live supported_locales: 11 × ga)
- F8–F10 [minor] TopAppBar inset, route-count method, font licence → ACCEPTED
Questions: wallet rule 26, remote config endpoint, dual push path, admin session in browser → answered in plan.

## Round 2 — CONVERGED
F1–F10 closed (F7 rejection accepted by partner: LanguageContext.tsx L29-78 lists 11 GA locales).
- F11 [minor] Wave 0 sequencing: ORB spike depends on G1 → ACCEPTED
- F12 [minor] `tr` missing from supported_locales migrations → ACCEPTED (fixup migration, own VTID)
- Q1 UI kit before lanes → answered (core primitives weeks 4–8, rest on demand)

## Owner correction 2026-10-10 ("We use Aurora, not Supabase") — re-opened
- Round 3 — NOT CONVERGED: verified .env, 270 vs 5 gateway files, runbook, postgrest-aurora-proxy. F13 [blocker] G1 had no sign-in provider without production Supabase → ACCEPTED (separate free-tier test Supabase project for auth, Realtime, Storage). F14 [major] realtime (~66 files) and storage (~34 files) untestable on an Aurora-only G1 → ACCEPTED (Profile A mirrors today's production; Profile B proves the Aurora data path). Q: native uses the Supabase client for auth/Realtime/Storage like web; no new gateway work.
- Round 4 (closing) — CONVERGED: F1–F14 closed.
- Final plan sha256: 7ef16a9e89564203146b479286dfc7f33025c26587f7aa07fe0fb685521cc0a2
