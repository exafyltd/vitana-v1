# Plan sparring record — profile-posts-full-width (VTID-05330)

- Partner: CI PLAN-SPAR (vitana-platform `PLAN-SPAR.yml`), session `9bbf4b05-4909-4b89-83c3-4a863b780da5`, runs
  https://github.com/exafyltd/vitana-platform/actions/runs/39748064485 (round 1) and
  https://github.com/exafyltd/vitana-platform/actions/runs/39749436039 (round 2).
- Class: standard
- Plan hash (sha256 of the text between the plan markers, final): ae61993eb97c4aa83cde9a6aded242d0bd7a753e81793b5a3c83ca57c69dfd65
- Verdict: **CONVERGED** (round 2; R1-F1 major, R1-F2..F4 minor — all ACCEPTED). In round 2 the partner reported
  HTTP 403 on its code reads and confirmed the round-1 answers from the plan text; round 1 verified the premises
  against vitana-v1 code (`file:line`).
- Owner approval (Gate 1): not asked — policy approval `converged-auto-v1` at 2026-10-22T08:45:22Z replaces Gate 1
  for a CI-sparred plan (CLAUDE.md autonomy contract, VTID-05214/05218). The owner set the scope in the Kiro Web
  chat 2026-10-22: "The profile Posts tab only".
- VTIDs: VTID-05330 (lane `card-layout`), allocated by CI PLAN-SPAR.
- Spec: vitana-platform `.kiro/specs/profile-posts-full-width/` (plan PR exafyltd/vitana-platform#4299, merged
  30b2062762ae620a4075a1baf73ed99778495a7a).

## Round 1 (verbatim)

# Sparring round 1 — in_progress

Session: `9bbf4b05-4909-4b89-83c3-4a863b780da5` · plan hash `9a0303670e71fdd4fb7f9cedae6f8a249a217fd335892b634ca9e7f03539fe53`

## Summary

The plan's core premises about the current structure of ProfilePostsTab.tsx hold: the body wrapper is `space-y-4 relative px-5 py-4 md:px-6 md:py-5` (line 208), the header row is `flex items-start gap-3` (line 209) wrapping the `h-11 w-11` avatar (line 212) and a `flex-1 min-w-0` column (line 221) that contains name/handle/delete (222-234), text/background block (235-246), FeedMedia image (247-253) and raw <video> (254-266); the divider (270) and like/comment/share pill (272) are already full-width siblings. The three call sites (ProfileLayout.tsx:270, ProfileSplitNavigation.tsx:161, EditProfilePage.tsx:521) are confirmed and no existing layout test for the card exists. Two defects: (1) the plan changes `items-start` to `items-center` on the header row, which visibly changes desktop alignment, contradicting the explicit "desktop unchanged" decision; (2) the video path is a raw `<video>` element, not `FeedMedia` (which the change descriptions/tests conflate). Several minor gaps around class overrides and the incomplete test-mock list.

## Findings

### R1-F1 [major]

The plan claims the desktop appearance is 'unchanged' / 'renders as on main', but change step 1 alters the header row from `flex items-start gap-3` to `flex items-center gap-3`. On desktop (and any width) this changes vertical alignment of the avatar/name/time row from top-aligned to center-aligned, shifting the name row position relative to the 44px avatar. This is a real visual change applied to all three consumers, including the desktop split view and EditProfilePage.

- `exafyltd/vitana-v1:src/components/profile/shared/tabs/ProfilePostsTab.tsx:209` — <div className="flex items-start gap-3">

Suggestion: Keep the header row as `flex items-start gap-3` (do not switch to items-center) so the avatar/name alignment is preserved on desktop, or if `items-center` is required for the mobile look, make it responsive (`items-start md:items-start`) and explicitly note in the plan that this is a deliberate alignment change contradicting the 'desktop unchanged' claim so the owner can confirm.

### R1-F2 [minor]

The plan's change descriptions and tests refer to media via `FeedMedia`, but the video post path renders a raw `<video>` element inside its own `rounded-xl overflow-hidden shadow-md bg-black` wrapper (lines 254-266), not `FeedMedia` (`FeedMedia` is only used for images at 247-253). Step 3 must also strip `rounded-xl shadow-md` from this raw video wrapper on mobile to achieve 'no rounding, no shadow', and the `-mx-5`/`md:ps-14` classes must be applied to that wrapper, not (only) to a FeedMedia element that does not exist for video posts. Similarly the background-style text block (line 237) carries its own `rounded-xl` that must be overridden edge-to-edge on mobile.

- `exafyltd/vitana-v1:src/components/profile/shared/tabs/ProfilePostsTab.tsx:254` — {post.video_url && (
                <div className="mt-4 rounded-xl overflow-hidden shadow-md bg-black">
                  <video ... className="w-full max-h-80 object-contain"/>

Suggestion: Update the change/tests to distinguish the image path (FeedMedia) from the raw `<video>` path (its own wrapper div), and apply the mobile `-mx-5 rounded-none shadow-none` + desktop `md:ps-14 md:rounded-xl md:shadow-md` classes to BOTH the FeedMedia element and the raw video wrapper (and the background-style text block's `rounded-xl`).

### R1-F3 [minor]

The test-mock list (useProfilePosts, usePostInteractions, useAuth, useShareOrCopy) is incomplete for a render test. The component also calls `useNavigate` (react-router, line 172 — needs a Router/MemoryRouter context or a mock), `useTranslation` (line 39), and renders `Tooltip`/`MentionInput`/`getPostBackground`/`renderMentions`/`FeedMedia`. Omitting these will produce missing-context or unhandled-hook errors.

- `exafyltd/vitana-v1:src/components/profile/shared/tabs/ProfilePostsTab.tsx:171` — const { user } = useAuth();
    const navigate = useNavigate();
    const { isLiked, toggleLike, comments, addComment, isAddingComment, deleteComment } = usePostInteractions(post.id);

Suggestion: Enumerate the full mock/context surface in the test plan (wrap in MemoryRouter; mock useState-driven child components or provide Router/Tooltip providers as needed), or assert the test renders within a Router + the appropriate providers so it does not fail on missing context.

### R1-F4 [minor]

The `-mx-5` edge-to-edge approach relies on overriding classes that are currently passed through `cn`/`twMerge` (e.g. FeedMedia receives `className="mt-4 rounded-xl shadow-md"` at lines 247-253, and the Card/body carry `overflow-hidden`). The plan summarizes 'no rounding, no shadow' but does not state that the existing `mt-4 rounded-xl shadow-md` / `rounded-xl` / `shadow-md` classes passed at the call sites must be made responsive (`rounded-none shadow-none md:rounded-xl md:shadow-md`). Leaving them un-reset will show rounded/shadowed corners on the edge-to-edge mobile media.

- `exafyltd/vitana-v1:src/components/profile/shared/tabs/ProfilePostsTab.tsx:247` — <FeedMedia
                  imageUrl={post.image_url}
                  alt={t('screens.profile.postImage')}
                  className="mt-4 rounded-xl shadow-md"

Suggestion: Specify that the className passed to FeedMedia and the video wrapper's own `rounded-xl shadow-md` must become responsive (`rounded-none shadow-none` on mobile, `md:rounded-xl md:shadow-md` on desktop) so the edge-to-edge mobile media renders without rounding/shadow.

## Next

Planner: answer every finding above in `sparring/responses-1.md` as one ```json block
`[{"finding_id": "...", "disposition": "accepted|rejected|deferred", "rationale": "...", "deferred_to": "..."}]`,
update `plan.md` (the plan block), commit both and push. That push starts the next round.

## Responses 1 (verbatim)

# Responses — round 1

```json
[
  {
    "finding_id": "R1-F1",
    "disposition": "accepted",
    "rationale": "Correct: a plain switch to items-center would change desktop alignment. Plan §Change now uses a two-column grid with items-center on phones and md:items-start from md (today's alignment); the avatar gets md:row-span-2 and the body md:col-start-2, which reproduces today's desktop avatar column. Measured on a local prototype (mocked hooks) at 1400x900: avatar, name, text and media left/top edges are identical to origin/main (341/53, 397/53, 397/87, 397/131). The vertical-centre change is phone-only and is the owner's requested look."
  },
  {
    "finding_id": "R1-F2",
    "disposition": "accepted",
    "rationale": "Plan §Change 3 and §Tests now treat the three blocks separately: image = FeedMedia (lines 247-253), video = the raw <video> wrapper div (lines 254-266, not FeedMedia), and the background-style block (line 237) including its own rounded-xl. Each gets its own responsive class string; the test asserts the raw video wrapper separately."
  },
  {
    "finding_id": "R1-F3",
    "disposition": "accepted",
    "rationale": "Plan §Tests now lists the full surface: render inside MemoryRouter (useNavigate); mocks for useProfilePosts, usePostInteractions, AuthProvider, useShareOrCopy, useTranslation, i18n-toast, locale-format and a FeedMedia stub; Tooltip/renderMentions/getPostBackground/MentionInput render real (the tab mounts its own TooltipProvider, ProfilePostsTab.tsx:135). Prototype: the test renders without context errors, 4/4 red on origin/main, 4/4 green after."
  },
  {
    "finding_id": "R1-F4",
    "disposition": "accepted",
    "rationale": "Plan §Change 3 now gives the exact before/after class strings: rounding and shadow are applied only with md: prefixes (md:rounded-xl md:shadow-md), the unprefixed rounded-xl/shadow-md are removed rather than reset, and FeedMedia gets w-auto (twMerge overrides its internal w-full via cn, FeedMedia.tsx:453-456) plus md:w-full so -mx-5 widens it."
  }
]
```

## Round 2 (verbatim)

# Sparring round 2 — converged

Session: `9bbf4b05-4909-4b89-83c3-4a863b780da5` · plan hash `ae61993eb97c4aa83cde9a6aded242d0bd7a753e81793b5a3c83ca57c69dfd65`

## Summary

Both pinned-commit repositories return HTTP 403 for every read_file / list_dir call in this round, making independent code-level verification of the revised plan impossible. All four round-1 findings were accepted by the planner and the revised plan addresses each one in text: R1-F1 via a two-column grid with `items-center md:items-start` and `md:row-span-2`; R1-F2 via separate class strings for FeedMedia, the raw video wrapper, and the background-style block; R1-F3 via an explicit full mock/context surface including MemoryRouter; R1-F4 via removing the unprefixed rounding/shadow and gating them under `md:` prefixes. No new findings can be raised this round because no files could be read to supply the required citation evidence.

## Findings

_none_
## Acknowledgements of earlier responses

- R1-F1: acknowledged — Planner accepted. The revised plan replaces the single-flex row with a two-column grid (`items-center md:items-start`, `md:row-span-2` on avatar, `md:col-start-2` on body), serving both the requested phone-only center-alignment and the preserved desktop top-alignment. Rationale is sound.
- R1-F2: acknowledged — Planner accepted. The revised §Change 3 now provides separate responsive class strings for each of the three media blocks: FeedMedia image, raw video wrapper div, and background-style block. Rationale is sound.
- R1-F3: acknowledged — Planner accepted. The test plan now enumerates the full hook/context mock surface, wraps the render in MemoryRouter, and calls out that Tooltip/renderMentions/getPostBackground/MentionInput render real under the tab's own TooltipProvider. Rationale is sound.
- R1-F4: acknowledged — Planner accepted. The revised plan removes the unprefixed `rounded-xl shadow-md` from FeedMedia's className and the video wrapper, adding them back only under `md:` prefixes, so mobile renders edge-to-edge without rounded corners or shadow. Rationale is sound.
