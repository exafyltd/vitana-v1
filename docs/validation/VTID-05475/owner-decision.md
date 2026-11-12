# VTID-05475 — Owner decision (copied from plan §8.0)

Plan: exafyltd/vitana-platform `.kiro/specs/welcome-finish-r2/plan.md`. Sparred, CONVERGED, policy-approved
(`converged-auto-v1`, final plan hash `be1e29771527a2f52bacac3a8a248bf11b35c4ffaa38738f49b6c6edd47d3ecd`). VTID-05475
allocated by CI PLAN-SPAR.

## §8.0 — Owner decision (final, supersedes D1), 2026-10-30 — verbatim

> community introductions are an explicit choice; nobody is introduced (no new-member card, no Say Hello eligibility)
> until they choose "Yes, introduce me 👋"; backfill authorized in principle (preserve recorded opt-ins/opt-outs, clear
> automatic inclusion), file and target database still need the owner's approval before applying (§7d). The Mariia
> mapping question is closed (Mariia Maksina = @mariia04 = `67c971fc-48f3-49ce-aaa8-cddb6fa9e63a`; vitana_id `mariia11`
> is the same account). Recorded in this plan and copied by the lane to `docs/validation/<VTID>/owner-decision.md`.
>
> Conservative choices inside it: no pre-selected answer; skipping the question never blocks registration and leaves
> opt-in false; the choice marker is a new nullable column rather than inferring from timestamps.

The owner's original words (plan §1):

> change community introductions to explicit choice … "Yes, introduce me 👋" / "Not now", with nobody publicly
> introduced until they actively choose Yes. I also authorize the necessary backfill: preserve recorded explicit
> opt-ins and opt-outs; remove automatic inclusion where no affirmative choice is recorded. … Keep the three private
> team welcome messages automatic and separate from this setting.

## This supersedes D1

VTID-05206 decision D1 (2026-10-15) made community introductions **default ON** — a new signup's
`community_intro_opt_in` defaulted to `true`. This decision reverses that: the default becomes `false` and nobody is
introduced until they make an explicit, affirmative choice. The three private team welcome DMs are unchanged (automatic,
separate from this setting).

## ⚠️ R2-F1 disclosure — the owner must know this before approving the apply

Sparring round 2 finding R2-F1 (minor, accepted): **any explicit opt-in made during the window between this code
deploying and the migration being applied is reverted by the backfill.** During that window the app's backward-compatible
fallback writes only `community_intro_opt_in` (no `community_intro_choice_at` marker, because the column does not exist
yet). The migration's backfill treats a row with no marker as "no recorded choice" and sets it to `false`. So a member
who taps "Yes, introduce me 👋" during registration, or toggles ON in Settings, in that window loses that explicit choice
when the migration is applied. The window is bounded by the owner stop on applying (§7d) and the blast radius is tiny
(2 default-true rows today, 251 already false). The owner is made aware of this here so the decision to apply is informed;
affected members can simply choose Yes again afterwards.

## Applying the migration is an owner stop (§7d)

The migration file (`supabase/migrations/20261103120000_vtid_05475_community_intro_explicit_choice.sql`) merges with the
lane as a FILE only. Staging shares the production database, so applying it needs the owner's approval of both the file
and the target database before `apply-vtid-05475-community-intro-explicit-choice-migration.yml` is dispatched. Until it is
applied the code is backward-compatible (the Settings toggle and registration keep working; new signups keep the
pre-migration default). "Nobody is introduced until they choose Yes" holds for new signups only after the apply.

## Mariia mapping — closed

Mariia Maksina = @mariia04 = `67c971fc-48f3-49ce-aaa8-cddb6fa9e63a`; vitana_id `mariia11` is the same account. No open
question remains on this mapping.
