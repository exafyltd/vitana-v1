# Plan sparring record — VTID-04979

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard; rounds: 2 (cap 3)
- Plan hash (sha256 of text between plan markers, first 16): aa48d5be0f6ab88f
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat, 2026-10-08 — "Yes" to the plan as presented at Gate 1

## Rounds
- R1: F1 major (i18n scope: 11 locale files, not 2) ACCEPTED; F2 major (drawer→dialog sequencing) ACCEPTED with a concrete mechanism, inline-form alternative REJECTED; F3 minor (What's New) ACCEPTED as an explicit skip; F4 minor (shape change) ACCEPTED as intended; F5 minor (initialUrl behaviour) ACCEPTED; F6 minor (desktop also greys logos) ACCEPTED as out of scope / follow-up.
- R2: F1–F6 all closed; no new blockers or majors → converged.

## Decisions taken during implementation (owner may overrule)
- "Verbinden:" label sits on its own line above the logo row, so all six 36px tiles fit on one row at 390px (with the label inline, Facebook wrapped onto a second line).
- `SocialMediaImportDialog`'s pre-existing `catch (error: any)` changed to `unknown` (lint error in a file this PR touches; behaviour unchanged).
- pt strings use the pt-BR você-form the register check requires.
- The ledger row update (title/status/approval metadata) was not applied: the SQL call was cancelled in session; title/summary are in this record and the PR.

## Plan and planner responses (verbatim)

# Plan: Social tab — brand-coloured logos + "+" opens a channel picker

**Change class:** standard (more than 3 files because of the i18n catalogs; no migrations, routes, auth, `.github`, deploy, governance or LLM-routing files)
**Scope:** vitana-v1 only. `src/components/profile/mobile/MobileIdCardBack.tsx`, new `src/components/profile/mobile/SocialChannelPickerDrawer.tsx`, `src/components/profile/dialogs/SocialMediaImportDialog.tsx` (optional `initialUrl` prop only), new `src/components/profile/mobile/MobileIdCardBack.test.tsx`, `src/i18n/*/socialImport.json` (new keys), new read-only staging spec `tests/e2e/staging/vtid-<new>-social-channels.staging.spec.ts`, `docs/validation/<VTID>/*`.

<!-- plan:begin -->
Owner request 2026-10-08 (screenshot of Profile → Soziales on Android): (1) the "Verbinden:" row shows the six social logos washed out — use the original logos in their real app-icon colours; (2) tapping the big "+" in the empty state must open a drawer listing every available social channel; picking one opens the same edit-channel dialog that tapping a logo in the row already opens.

Facts verified in code: `MobileIdCardBack.tsx` (rendered by `MobileIdCardSwitcher` for the "back"/Social segment) wraps each unconnected logo in `<div className="opacity-40 grayscale">` (L202) inside a 32px white/60 circle — that is the washed-out look. The icon components (`LinkedInIcon`, `InstagramIcon`, `TikTokIcon`, `YouTubeIcon`, `FacebookIcon`, `XIcon`) already draw the official brand colours (`connected` defaults to true). TikTok's glyph is white with cyan/red offsets, so it is invisible on a white tile unless it sits on black (TikTok's own app icon). The "+" in the empty state (L214) is a plain `<div>` with no handler. Tapping a logo calls `handleConnect(platform)` → `SocialMediaImportDialog` (a Radix Dialog; the owner calls it the "edit channel drawer").

Change:
1. Unconnected "Verbinden:" row (owner + editMode, unchanged condition): remove `opacity-40 grayscale`; each logo sits on a 36px rounded-xl app-icon tile — white with a soft shadow for LinkedIn, Instagram, X, YouTube, Facebook; black for TikTok (tile background comes from a new `tileBg` field on `PlatformConfig`). Logo size h-6 w-6. Each tile gets `aria-label` "<name> verbinden" via a new i18n key with `{platform}`. Tap target ≥ 36px; the row may wrap (`flex-wrap`) on narrow phones so it never overflows at 320px.
2. Empty state "+" becomes a `<button>` (owner only — the visitor branch is untouched and keeps no connect affordance) with `aria-label` from a new key, opening `SocialChannelPickerDrawer` (shadcn `Drawer` from `@/components/ui/drawer`, the pattern used by `DancePreferencesDrawer`). When at least one account is connected, the owner's connected grid gets one extra "+" tile (same handler) so the picker is reachable in every state; still owner-only.
3. `SocialChannelPickerDrawer` lists all six platforms (same order as the row) as full-width rows: brand-coloured logo tile, platform name, and on the right either a green "Verbunden" badge (connected) or a chevron. Tapping any row closes the picker and calls the same `handleConnect(platform)` the logo row uses → `SocialMediaImportDialog` opens for that platform. For a connected platform the dialog is pre-filled with the stored URL via a new optional `initialUrl` prop: when `open` becomes true and `initialUrl` is set, the profile-URL `<Input>` (`#profile-url`) is set to it; nothing else changes (same title, same "Import Profile" button, bio empty). Existing callers omit it and behave exactly as today. Sequencing (never two modals at once): state lives in MobileIdCardBack as `pickerOpen`, `pendingPlatform`, `selectedPlatform`, `dialogOpen`. `onPick(p)` sets `pendingPlatform=p` and `pickerOpen=false` only. The dialog is opened from vaul's `onAnimationEnd(open)` callback on the Drawer root when `open===false && pendingPlatform` (then `selectedPlatform=pendingPlatform; pendingPlatform=null; dialogOpen=true`) — i.e. after vaul has finished its close animation and released its scroll lock/focus trap. If the installed vaul (^0.9.9) does not expose `onAnimationEnd`, the fallback is a `useEffect` on `[pickerOpen, pendingPlatform]` that opens the dialog via a 550 ms `setTimeout` (cleared on unmount), longer than vaul's 500 ms close transition. Dismissing the picker without a pick leaves `pendingPlatform` null, so nothing opens. Inline-form-in-drawer was considered and rejected: the owner asked that both paths lead to the SAME edit dialog, and the dialog carries the AI-consent sub-dialog.
4. i18n: new keys in `socialImport` — `pickerTitle`, `pickerDescription`, `connected`, `connectPlatformAria` (`{platform}`), `addChannelAria`. DE first (du-form), then EN, then ALL other 9 existing `socialImport.json` files (ar, es, fr, pl, pt, ru, sr, tr, zh) get the keys translated in the same PR (short UI strings, informal register per locale) so no locale regresses from full coverage; `npm run i18n:gate -- --all` / `i18n:register` / `i18n:audit` must stay as green as on main. No hardcoded JSX strings (ESLint i18n rules). RTL: use `ms-*/me-*`, `text-start`, chevron flipped with `rtl:rotate-180`.
5. Not changed: connected grid tile look (already brand-coloured), visitor view, the import edge function, data model. Desktop `src/components/profile/shared/ProfileIdCardBack.tsx` also greys unconnected logos (`filter: grayscale(0.7)` L224, `grayscale(1)` L281) — the owner's screenshot and request are the mobile Social tab, so desktop is out of scope here and named to the owner as a follow-up.
6. Shape: the owner asked for "app icon" look, so tiles change from 32px circles to 36px rounded squares (`rounded-xl`, like phone app icons) — intentional. The "+" tile in the connected grid (`grid-cols-3`) simply takes the next cell; a partially filled last row is acceptable (same as today with 1, 2, 4 or 5 connected).
7. What's New: skipped — this is a fix of washed-out icons plus making an existing dead "+" button work; no new feature a member would be told about (CLAUDE.md "skip for fixes"). Listed in Gate 2 decisions.

Verification: Vitest `MobileIdCardBack.test.tsx` (mock ProfileProvider/AuthProvider/useTranslation and the import dialog): no element in the connect row has `grayscale`/`opacity-40`; TikTok tile has the black background; tapping "+" opens the picker with 6 platforms; tapping a picker row opens the import dialog for that platform (and closes the picker); tapping a logo in the row opens the same dialog; visitor view renders no "+" and no picker; connected platform row shows "connected" and passes its URL as `initialUrl`. `npm run lint` (i18n rules), `npx tsc --noEmit`, `npm run build`, i18n gate scripts. Read-only staging spec at 390×844 signed in as the test user: open own profile `?card=back`; if the empty-state "+" is present, tap it (UI only, nothing written), assert the drawer shows 6 channel rows, close it; assert the connect-row logos have no `grayscale` class/filter; skip gracefully when the account has all channels connected or editMode row is not shown. No submit is ever clicked. Visual check: Playwright screenshots of the component at 390×844 locally (Vitest/Storybook-free render via the PR preview by the owner on phone widths).
Risks: two stacked Radix modals (handled by sequencing); RTL layout of the row; staging spec must never click "Import".
<!-- plan:end -->

## Planner responses (round 1)
**F1 — ACCEPTED.** All 11 existing socialImport.json files get the new keys (plan item 4).
**F2 — ACCEPTED.** Concrete sequencing: pending-platform state + vaul `onAnimationEnd(false)` opens the dialog after the drawer is fully closed; fallback 550 ms timer if that prop is missing in vaul ^0.9.9 (plan item 3). Inline form REJECTED: the owner wants both paths to open the same edit dialog.
**F3 — ACCEPTED as explicit skip** with reason (plan item 7).
**F4 — ACCEPTED.** Shape change to rounded-square app icons is intentional (plan item 6).
**F5 — ACCEPTED.** initialUrl pre-fills only #profile-url; nothing else changes (plan item 3).
**F6 — ACCEPTED.** Desktop greys logos too; out of scope, named as follow-up (plan item 5).
Q1: DancePreferencesDrawer.tsx:21 imports from "@/components/ui/drawer" — verified. Q2: see F2. Q3: plan item 6. Q4: all 11.
