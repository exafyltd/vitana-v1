
<context>
Goal: Fix the “flashlight” glow around the mobile Orb so it never washes out surrounding content, while keeping a premium, tight halo close to the Orb (≤ ~10px beyond edge). User reports it’s still not fixed after prior changes.

Key observation from current codebase:
- We already set `filter: none !important;` for `.vitana-orb` and related selectors in `src/index.css` inside the mobile media query.
- However, `MobileFixedOrb.tsx` still applies Tailwind’s `drop-shadow-lg` to the clickable orb wrapper (`className="cursor-pointer drop-shadow-lg"`).
  - Tailwind `drop-shadow-*` works via CSS `filter: drop-shadow(...)`.
  - Our current “filter: none” is applied to `.vitana-orb` (outer container), but the flashlight glow can still come from `filter` on the *inner* clickable div (the element that has `drop-shadow-lg`).
  - This exactly matches the user’s diagnosis: the bleeding glow is coming from CSS filters, and wrapper containment doesn’t reliably clip filtered rendering.
</context>

<what-we-will-change>
We will do the fix in the user-specified order:

1) Hard-disable filter glow on mobile for the Orb/seed container and the clickable wrapper that currently has Tailwind `drop-shadow-lg`.
2) Confirm nav-size halo tuning in `VitanalandPortalSeed` is applied only to `size === "nav"` (it already is, but we will verify/adjust to match acceptance criteria if needed).
3) If any spill remains after (1) + (2), add a soft mask fade containment (not `overflow:hidden`) around the seed on mobile only.
</what-we-will-change>

<step-by-step>
Step 1 — Remove/override Tailwind drop-shadow filter on MobileFixedOrb
- Update `src/components/mobile/MobileFixedOrb.tsx`
  - Remove the `drop-shadow-lg` class from the clickable wrapper.
  - Keep the orb visible using a subtle `box-shadow` (not filter) either via Tailwind’s `shadow-*` utilities or via a small inline style/class.

Why this is necessary:
- Right now the clickable wrapper is still applying a `filter: drop-shadow(...)` (via Tailwind), which can bleed and is not prevented by setting filter on the parent `.vitana-orb`.

Step 2 — Expand mobile CSS “filter: none !important” to cover the clickable wrapper safely
- Update `src/index.css` mobile block:
  - Keep the existing `filter: none !important;` on `.vitana-orb, [data-vitana-orb="true"], #vitana-orb, .OrbFloatingButton`.
  - Add a targeted rule for the clickable wrapper element inside the orb (so even if some component adds a drop-shadow utility again later, it won’t reintroduce the flashlight):
    - e.g. `.vitana-orb [role="button"] { filter: none !important; }`
    - and/or `.vitana-orb .drop-shadow-lg { filter: none !important; }`
  - Keep the subtle depth via `box-shadow` (not filter). We’ll keep (or slightly adjust) your current:
    - `box-shadow: 0 6px 18px rgba(0,0,0,0.18);`

Important constraint:
- We must NOT apply `filter: none` to all descendants (e.g. `.vitana-orb *`) because `VitanalandPortalSeed` intentionally uses `filter: blur(...)` internally for the orb’s internal effects. Disabling those would degrade the orb visuals.
- Therefore, we only target the orb wrapper/click area that should never use filter-based glow.

Step 3 — Verify nav halo tuning is correctly constrained to nav only
- Verify `src/components/audio/VitanalandPortalSeed.tsx` `sizeConfig.nav`:
  - `outerHaloInset: -5`
  - `secondHaloInset: -7`
  - `outerBlur: 9`
  - `secondBlur: 11`
  - `outerHaloOpacity: 0.18–0.22` (we’ll set a precise value, likely `0.20`)
  - `secondHaloOpacity` scaled accordingly (likely ~`0.10`)
- Confirm `md`/`lg` remain unchanged.

If the halo is still slightly too wide on some phones after Step 1–2:
- Tighten nav only a bit further (still nav-only):
  - slightly reduce blur by 1–2px and/or inset by 1px while keeping the orb readable.
  - This will be judged by the acceptance criteria and screenshots.

Step 4 — Optional “premium containment” using mask fade (only if needed after 1–3)
If (after removing filter-based glow) there’s still visible spill from the halo layers:
- Update `src/components/mobile/MobileFixedOrb.tsx` to wrap `VitanalandPortalSeed` in a mask-fade container:
  - Use the user-provided radial mask gradient:
    - `mask-image: radial-gradient(circle, #000 62%, transparent 78%)`
    - `-webkit-mask-image: radial-gradient(circle, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 78%)`
  - Set width/height to 72×72 (or tuned if needed), keep `border-radius: 9999px`.

This avoids “hard cropping” artifacts and will only be used if the halo still bleeds after filters are truly disabled.

Step 5 — Verification checklist (mobile)
We will test in Lovable’s mobile viewport + (ideally) real phone/PWA:
- Open `/home` (user’s current route).
- Confirm:
  - No wash-out on the Events feed card text.
  - Halo remains visible but tight (≤ ~10px beyond orb edge).
  - No harsh clipped circle edge.
- Also test on a couple of widths:
  - small phone width (e.g., 360–390)
  - larger phone width (e.g., 414)

Step 6 — If still not fixed, identify any other filter sources
If a screenshot still shows flashlight after Steps 1–4:
- We will search for any additional orb wrapper styles applying `filter:` (including Tailwind `drop-shadow-*`) in other orb renderers and apply the same mobile override for those specific wrappers.
</step-by-step>

<files-to-change>
- `src/components/mobile/MobileFixedOrb.tsx`
  - Remove `drop-shadow-lg` from the orb’s clickable wrapper
  - Optionally add mask-fade wrapper (only if needed)
- `src/index.css`
  - Keep existing mobile `filter: none !important` on orb container selectors
  - Add targeted mobile overrides for the clickable wrapper (`[role="button"]`) and/or `.drop-shadow-lg` to prevent future reintroduction
  - Keep subtle depth using `box-shadow` instead of `filter`
- `src/components/audio/VitanalandPortalSeed.tsx` (verify; adjust nav-only values only if needed to meet acceptance)
</files-to-change>

<acceptance-criteria>
- On mobile, halo does not wash out any card text (e.g., Events feed).
- Halo stays tight: ≤ ~10px beyond orb edge.
- No harsh cropped circle edge (if containment is required, use mask fade).
- Works across small + large phones.
</acceptance-criteria>

<risk-notes>
- Over-broad `filter: none` could accidentally disable the orb’s internal blur-based aesthetic. We’ll avoid descendant-wide rules and only neutralize filter on the orb wrapper/click area.
- Tailwind utility classes can reintroduce filters. The CSS safeguard targeting the clickable wrapper helps prevent regressions.
</risk-notes>
