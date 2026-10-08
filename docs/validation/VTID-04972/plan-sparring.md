# Plan sparring record — VTID-04972

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard; rounds: 2 (cap 3)
- Plan hash (sha256 of text between plan markers, first 16): 495f21ea1f8334f1
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat, 2026-10-08 ("yes") after choosing option C with B's Say-hello button

## Rounds
- R1: F1 major (existing VTID-04957 spec pinned the member card to the pale tint) — ACCEPTED; F2 major (token mapping incomplete: tint token, class-by-class swaps) — ACCEPTED; F3 minor (four tailwind entries) — ACCEPTED; F4 minor (file count/class) — ACCEPTED; F5 minor (contrast ratios missing) — ACCEPTED.
- R2: F1-F5 closed, no new findings → converged.

## Plan and planner responses (verbatim)

# Plan: richer lavender for the "Did you know?" and "New in the community" feed cards (owner choice "C", with B's Say-hello button)

**Change class:** standard (4 source files + 1 new spec + docs; no migrations, routes, auth, `.github`, deploy, governance or LLM-routing files)
**Scope:** vitana-v1 only. `src/index.css` (tip tokens + new member-card tokens, light + dark), `tailwind.config.ts` (expose the new member tokens), `src/components/home/NewMemberCard.tsx` (class swaps listed below), the EXISTING `tests/e2e/staging/vtid-04957-feed-cards.staging.spec.ts` (updated), a new `tests/e2e/staging/vtid-<new>-card-colours.staging.spec.ts`, `docs/validation/<VTID>/*`.

<!-- plan:begin -->
Context: PR #1259 (VTID-04957, in production since 2026-10-07) restyled both cards to the pale Vitana-card lavender (`--sys-vitana-card` 235 100% 98%). Owner feedback 2026-10-08 (screenshot): the feed reads washed out because the two restyled cards now share that same pale tint. Owner picked option C from a mockup (bolder lavender, same family) but keeps B's pastel "Say hello" button. The Vitana cards (Vitana Index, Audiobook, Invite) are NOT changed.

Target values (HSL, from the approved mockup):
- "Did you know?" (FeatureAnnouncementCard `did-you-know-feature`, via `--sys-feature-tip-*`): card 250 80% 94%, border 250 60% 80%, accent (title + "Try it now") 250 70% 45%, tint (icon wrap) 250 80% 90%. Dark: card 250 28% 17%, border 250 30% 32%, accent 250 80% 76%, tint 250 28% 24%.
- "New in the community" (NewMemberCard): new tokens `--sys-member-card` 262 80% 94% / dark 262 28% 17%; `--sys-member-card-border` 262 60% 78% / dark 262 30% 32%; `--sys-member-accent` 262 80% 48% / dark 262 83% 74%; `--sys-member-tint` 262 80% 90% / dark 262 28% 24% (avatar fallback bg and outline-button hover). Four `sys.member` entries added to tailwind.config.ts, mirroring the `feature.new` group (accent, tint, card, card-border). Exact class swaps in NewMemberCard: `bg-sys-vitana-card`→`bg-sys-member-card`; `border-sys-vitana-card-border`→`border-sys-member-card-border`; `text-sys-feature-new-accent` (eyebrow, avatar fallback text, outline button text)→`text-sys-member-accent`; `ring-sys-feature-new-card-border`→`ring-sys-member-card-border`; `bg-sys-feature-new-tint`→`bg-sys-member-tint`; `hover:bg-sys-feature-new-tint`→`hover:bg-sys-member-tint`; `border-sys-feature-new-card-border` (outline button)→`border-sys-member-accent` at 1.5px with `bg-white dark:bg-sys-member-card`. The existing `--sys-feature-new-*` vars and tailwind entries stay UNTOUCHED (still used by the brand-new-feature variant).
- "Say hello" unchanged from B: `bg-violet-300 text-violet-950 hover:bg-violet-400`.

Not changed: copy/emoji, layout, tidyTitle, behaviour, testids, i18n. No What's New entry (restyle).

Verification: Vitest (NewMemberCard unchanged behaviour). The existing VTID-04957 staging spec's member-card assertion (`actual === --sys-vitana-card`) is REPLACED by the same lavender-hue check as the new spec (blue channel above red AND saturation above a floor), so it survives palette tweaks; its wrap/overflow checks stay. A new read-only spec asserts both cards' computed surfaces are lavender and NOT equal to `--sys-vitana-card` (so the washed-out tint cannot silently return), phone viewports, tolerant (skip if no such card), measured atomically in one in-page evaluate. WCAG contrast (computed, WCAG 2.x relative luminance): light — tip title/link 250 70% 45% on 250 80% 94% = 7.59:1; member eyebrow 262 80% 48% on 262 80% 94% = 6.37:1; View profile text #6d28d9 on white = 7.10:1; Say hello text #2e1065 on #c4b5fd = 8.25:1. Dark — tip accent 250 80% 76% on 250 28% 17% = 5.92:1; member accent 262 83% 74% on 262 28% 17% = 5.57:1. All ≥ 4.5:1. PR preview checked by the owner (iPhone + Samsung widths, light and dark).
Risks: dark-mode contrast of the new accents; `--sys-feature-tip-*` is consumed only by FeatureAnnouncementCard (verified in sparring of VTID-04957); RTL unaffected (colours only).
<!-- plan:end -->

## Planner responses (round 1)
**F1 — ACCEPTED.** The existing VTID-04957 spec is added to scope; its equality-to-`--sys-vitana-card` assertion is replaced by the lavender-hue check.
**F2 — ACCEPTED.** Added `--sys-member-tint` and an explicit class-by-class swap list; `--sys-feature-new-*` stays untouched (still used by the brand-new-feature variant).
**F3 — ACCEPTED.** Four `sys.member` entries added to tailwind.config.ts, mirroring `feature.new`.
**F4 — ACCEPTED.** Scope line corrected (4 source files + 1 new spec + docs); class set to standard.
**F5 — ACCEPTED.** Contrast ratios computed and written into the plan (all ≥ 5.5:1).
Q1: new `--sys-member-tint` token. Q2: yes, untouched. Q3: updated (hue check), plus a new spec for the new colours.
