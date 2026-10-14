# VTID-05176 — Plan Sparring record (Native app Wave 1, lane N2: Vitana Native UI core primitives, `@vitana/ui`)

- **VTID:** VTID-05176 (vitana-v1, "N2").
- **Program:** Native app, **VTID-05021**, Wave 1 "UI kit" (`docs/programs/native-app/NATIVE-APP-PLAN.md` §3, §5).
  Parallel Wave 1 lanes N1, N3–N6 each have their own sparred plan.
- **Sparring session:** `7f3abd71-5af9-4b62-b1c9-c95d831730ce` (`plan_sparring_sessions`).
- **Partner:** the independent `plan-sparring-partner` agent (read-only).
- **Change class:** standard. **Rounds:** 2. **Verdict: CONVERGED.**
- **Plan hash (round 1):** `02cc58168882c4a2f8405267e41327fef4c10b19579c2c75a73ad09bedd31bdb`
- **Plan hash (final):** `7f61b162d5a904334c6150e99cf1a91e333069905ee49d0e91068560238347e2` — sha256 of the text strictly
  between the plan begin and end markers below.
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session — Gate 1 2026-10-13: owner delegated decisions ("Continue and make the decisions yourself"; "build in parallel … quickest possible"); planner defaults taken (Open questions 1–6: StyleSheet + tokens, no NativeWind in v1; Select as a bottom-sheet list; one slider thumb per value with the web bug reported; no VCard/ScreenFrame in N2; Progress fills from the inline start; catalogue in `development`/`test-g1` only).

`<VTID>` / "N2 VTID" in the plan text is VTID-05176 for this PR (the plan was hashed before allocation, so the
placeholders are kept verbatim below). The plan's round-1 planner responses (after the end marker in the planner's
file) are summarised in the table; every one of them is implemented in this PR.

## Rounds

| Round | Finding | Severity | Answer |
|---|---|---|---|
| R1 | F1 — close buttons on the web sit at the physical right (`dialog.tsx:69`, `sheet.tsx:71`, `responsive-dialog.tsx:128-130`, `responsive-popover.tsx:160-168`); the plan did not say where the native ones go | major | **Accepted** — Fact F29b; cross-cutting rule in Change 9 (every native close button at the inline end); LTR + RTL tests per overlay; listed in the web-defects list (Change 34) |
| R1 | F2 — the `@vitana/tokens` interface used an undefined `ShadowStyle` and did not line up with N1's export set | major | **Accepted** — `ShadowStyle` defined (five fields) and checked by the tokens contract test; the delta N1 must additionally satisfy is listed in "Interfaces for other lanes" |
| R1 | F3 — a nested `VitanaUIProvider` (the catalogue inside N3's root) would render a second gesture root, overlay stack and toast host | major | **Accepted** — Change 7: `UIRootContext` marks the outermost provider; nested providers only override theme values; root-only / nested / standalone tests |
| R1 | F4 — drawer `shouldScaleBackground` is inert on the web (no `vaul-drawer-wrapper`) | minor | **Accepted** — in the web-defects list (Change 34) |
| R1 | F5 — the catalogue's i18n keys were not enumerated or checked per locale | minor | **Accepted** — Change 31 lists the exact existing keys in `src/ui/catalogue-keys.ts`; the catalogue test checks each in all 11 locales without the `de` fallback |
| R1 | F6 | minor | Acknowledged — no plan change |
| R1 | F7 | minor | Acknowledged — no plan change |
| R1 | F8 — web defects found while mirroring should reach the owner | minor | **Accepted** — Change 34: "Web defects found" list in `apps/mobile/README.md`, repeated in the PR body; each defect its own VTID after its own sparring |
| R2 | — | — | **CONVERGED** (all round-1 findings closed) |
| R2 | F9 | minor | Pre-existing (not introduced by this plan) — no change |

Nothing disputed, nothing escalated. The partner's findings are kept verbatim in the sparring session above.

## Final plan

<!-- plan:begin -->

## Meta
- **Change class:** standard. One sparred plan, one VTID (allocated after sparring and Gate 1; sparring record
  `docs/validation/<VTID>/plan-sparring.md`, `scope.json` listing the paths below). One vitana-v1 PR.
- **Program:** Native app VTID-05021, Wave 1 "UI kit" (program §3, §5 row 1; §5 row 2 says the core primitives and the
  shell are finished in weeks 4–8, before the screen lanes start). Parallel Wave 1 lanes: N1 core + tokens, N3 shell +
  auth + i18n, N4 push + deep links + app-config, N5 Health Sync, N6 ORB native.
- **Repo / areas (vitana-v1), all under `apps/mobile/`:**
  - new: `src/ui/**` (the kit), `src/ui/theme/tokens-stub.ts` (temporary), `app/native-ui-catalogue.tsx` (dev-only
    catalogue route), `tests/ui/**`, `jest.setup.ts`
  - edited: `package.json` + `package-lock.json` (two pinned deps), `tsconfig.json` (two `paths` aliases),
    `jest.config.js` (`setupFiles`, `moduleNameMapper`), `parity/ledger.json` (one `native_only` entry),
    `README.md` (a "Vitana Native UI" section incl. the web→native prop map)
  - **Not touched:** `src/**` (web, incl. `src/i18n/**`), `public/**`, root `package.json`/lock, `eslint.config.js`,
    workflows, `apps/mobile/app/_layout.tsx` (N3 owns the root layout; see Interfaces), `scripts/native/**`.
- **Production safety:** no network code at all; no endpoint is read from `src/config/env.ts`. No test, catalogue or
  CI step talks to any Vitana host. No i18n key is added (a new key is a `src/i18n/de` edit, i.e. a web deploy path).
- **Gates:** G1 (test env), G2 (Firebase), G3 (store/signing) are **not passed**; none is needed — code and unit tests
  proceed. Device runs of the catalogue (simulator screenshots, Maestro) wait for STATUS row 8b (native builds).

## Facts (file:line, origin/main `d7109abf2`)
**Wave 0 project (what N2 builds on)**
- F1 `apps/mobile/package.json`: Expo SDK 57 exact pins — `expo 57.0.25`, `react-native 0.86.3`, `react 19.2.3`,
  `expo-router 57.0.23`, **`react-native-reanimated 4.5.1`, `react-native-gesture-handler 2.32.0`,
  `react-native-worklets 0.10.1`**, `react-native-safe-area-context 5.7.0`, `react-native-screens 4.26.2`; dev:
  `jest-expo 57.0.5`, `@testing-library/react-native 13.3.3`, `typescript 6.0.3`. Own lockfile, not a root
  workspace (README `:12`). Scripts `typecheck`/`test`/`bundle`/`deps:check` (`:7-17`).
- F2 README `:9-10`: SDK 57, iOS ≥16.4, Android ≥API 24; `:46-48`: no hardcoded user-visible text incl.
  `accessibilityLabel`/`accessibilityHint`, new keys go to `src/i18n/de` first "which is a web deploy path", Arabic is
  RTL (`I18nManager.allowRTL(true)`), use start/end; `:65`: "UI kit … Wave 1, each with its own sparred plan".
- F3 `app/_layout.tsx:11-20`: `allowRTL(true)`, `SafeAreaProvider` → `I18nProvider` → `Stack`. No
  `GestureHandlerRootView`, no theme provider yet.
- F4 `src/i18n/I18nProvider.tsx:7-27`: `useI18n()` → `{ locale, rtl, setLocale, t }`; `src/i18n/index.ts:61-65`
  `translate()` falls back to `de`, then the key.
- F5 `jest.config.js:3-7`: preset `jest-expo`, `roots: ['<rootDir>/tests']`. `tsconfig.json`: extends
  `expo/tsconfig.base`, `strict`, no `paths`.
- F6 `parity/ledger.json`: keys `_comment, version, native_only, rows` (434 rows); `native_only` holds only `/`.
  `scripts/native/parity-ledger.mjs:245-251`: every route file under `app/` needs a ledger row or a `native_only`
  entry with a reason, else `--check` fails (rule d).
- F7 `eslint.config.js:25-28, 62-123` (Wave 0): `apps/mobile/**` gets the i18n rules (incl. `accessibilityLabel`/
  `accessibilityHint`), bans `window`/`document`/`localStorage`/`import.meta` and the web Supabase/gateway clients.
  `NATIVE-CI.yml` runs `deps:check`, `typecheck`, `test`, `bundle` for `apps/mobile/**` changes.

**Expo SDK 57 compatibility (registry, read-only, 2026-10-13)**
- F8 `expo@57.0.25/bundledNativeModules.json`: `react-native-svg 15.15.4` (published 2026-03-18),
  `@react-native-community/slider 5.2.0`, `react-native-reanimated 4.5.1`, `react-native-gesture-handler ~2.32.0`.
  `@gorhom/bottom-sheet` is not listed.
- F9 `lucide-react-native@1.48.0` published 2026-09-24 (≥14 days); peers `react *`/`react-native *` and
  `react-native-svg ^12–^15`. The web's `lucide-react ^0.462.0` (root `package.json:115`) has no React-19-compatible
  native twin: `lucide-react-native@0.462.0` peers `react ^16–^18` only.
- F10 `nativewind` latest `4.2.7` (2026-09-14, depends on `react-native-css-interop 0.2.7`), `5.0.0-rc.0` is a release
  candidate. Its compatibility with RN 0.86 + Reanimated 4.5 is not proven by anything in the repo.

**Web primitives (props to mirror) — `src/components/ui/`**
- F11 Use counts (files importing each, `git grep` on `src/`): button 681, card 392, badge 332, input 168, label 137,
  dialog 145, select 111, textarea 97, avatar 85, switch 49, skeleton 49, sheet 43, progress 41, responsive-dialog 39,
  tabs 28, checkbox 27, scroll-area 26, separator 25, tooltip 20, drawer (vaul) 18, dropdown-menu 17, popover 12,
  alert-dialog 11, responsive-confirm-dialog 10, slider 9, responsive-popover 6, radio-group 6, collapsible 5,
  accordion 4. Toasts: `@/hooks/use-toast` 172 files, `notify*()` from `@/lib/i18n-toast` 313 files, direct `sonner`
  64 files. `asChild` appears 152 times.
- F12 `button.tsx:7-38` variants `default|destructive|outline|secondary|ghost|link|solid|soft|pill`, sizes
  `default|sm|lg|icon|xs`; `:40-44` `ButtonProps = ButtonHTMLAttributes & VariantProps & { asChild? }`.
  `solid`/`soft`/`pill` use raw colours (`:21-23`: `#111827`, violet, black/5).
- F13 `badge.tsx:10-20` variants `default|secondary|destructive|success|outline`; `success` is raw `green-500`
  (`:17-18`). `card.tsx:5-79` six parts, `rounded-lg border bg-card shadow-sm`, `CardTitle` `text-2xl`.
- F14 `dialog.tsx`: Radix Root/Trigger/Close; `DialogContent` (`:54-76`) adds `overlayClassName`, centred `w-full
  max-w-lg`, rounded only from `sm:` (so square-cornered full width on a phone, `:63`); close button label
  `t('screens.ui.close')` (`:71`); overlay `bg-black/80` (`:41`). `DialogContentNoAnimation` / `NoOverlay`
  (`:78-157`) exist as Appilix WebView workarounds.
- F15 `sheet.tsx:36-53` `side: top|bottom|left|right` (default `right`, physical sides), overlay `backdrop-blur-sm
  bg-black/20` (`:26`), close `screens.ui.close` (`:71-74`).
- F16 `drawer.tsx` (vaul): `shouldScaleBackground = true` (`:7-15`), handle `h-2 w-[100px]` (`:53`), overlay as sheet
  (`:32`). No `vaul-drawer-wrapper` exists in `src/` or `index.html` (grep), so the background never actually scales.
- F17 `responsive-dialog.tsx`: `ResponsiveDialogProps {open, onOpenChange, children}` (`:13-17`);
  `ResponsiveDialogContent` adds `fullscreenOnMobile`, `hideCloseButton`, `overlayClassName` (`:55-63`); the phone
  branch is a bottom sheet `rounded-t-2xl`, `max-h-[calc(100dvh-24px)]`, bottom safe-area padding, or fullscreen with
  top safe-area padding (`:89-99`); handle `w-10 h-1` (`:105-109`); close 40×40 at top-end (`:128-133`); sticky
  header / scrollable body / sticky footer (`:144-209`).
- F18 `responsive-popover.tsx`: `{open, onOpenChange, defaultOpen, children}` (`:30-35`); on a phone it is a bottom
  sheet (`:55-63`, `:138-186`) with optional `title` and `hideCloseButton` (`:116-122`), close 44×44 (`:168`).
  `responsive-confirm-dialog.tsx:57-63` is a bottom sheet on a phone; Action/Cancel `h-12 text-base` (`:155-195`).
  `alert-dialog.tsx:28-45` is a centred dialog.
- F19 `use-mobile.tsx:3` breakpoint 1024 px: on every phone the Responsive* components take their mobile branch, so the
  native twins implement only that branch.
- F20 `useOrbSuppression.ts:1-29`: a ref-counted `body[data-dialog-open]` that hides the ORB; used only by `dialog`,
  `sheet`, `drawer` and `responsive-dialog` (grep of `src/components/ui/`). `popover`, `responsive-popover`,
  `responsive-confirm-dialog`, `alert-dialog`, `select`, `tooltip` do not suppress the ORB.
- F21 `popover.tsx:10-27` `align="center"`, `sideOffset=4`, `w-72`. `tooltip.tsx:6-30` Provider/Root/Trigger/Content,
  `sideOffset=4`. `tabs.tsx:6-53` Root/List/Trigger/Content (`value`, `defaultValue`, `onValueChange`).
- F22 `select.tsx`: Root/Group/Value/Trigger/Content/Label/Item/Separator (`export` `:147`); trigger uses raw
  `white/60`, `gray-900/40`, violet and sky colours (`:20`); content defaults to `position="popper"` (`:71`).
- F23 `switch.tsx:6-28` `checked`/`onCheckedChange`; RTL thumb fix VTID-04406 (`:18-21`). `checkbox.tsx:7-28`,
  `radio-group.tsx:7-42`, `accordion.tsx:7-56` (Radix Root props), `scroll-area.tsx:6-46` (`ScrollBar orientation`).
- F24 `slider.tsx:6-26` renders **one** `Thumb` (`:21`) whatever the length of `value`;
  `intents/FindMatchFilterSheet.tsx:149-155` passes `value={[draft.ageMin, draft.ageMax]}`, so the age range has a
  draggable thumb for its first value only on the web today.
- F25 `progress.tsx:19-20`: raw gradient `from-rose-300 via-orange-300 to-teal-300`, fill by physical
  `translateX(-(100-value)%)`.
- F26 `avatar.tsx:5-6, 90-100`: `AvatarImage` rewrites DiceBear URLs to a locally drawn SVG (`@/lib/localAvatar`) and
  storage URLs to a resized CDN URL (`@/lib/eventCoverImage`) — web `lib` logic, i.e. an extraction candidate (N1).
- F27 Toasts: `App.tsx:3-4, 761-762` mounts both the shadcn `<Toaster />` and `<SonnerToaster position="top-center"
  richColors />`. `hooks/use-toast.ts:8-9` `TOAST_LIMIT = 1`, `TOAST_REMOVE_DELAY = 5000`; `:11-16` `{id, title,
  description, action}`; `toast.tsx:17` viewport at the top on phones, variants `default|destructive` (`:28-36`).
  `lib/i18n-toast.ts:134-174` `notify|notifySuccess|notifyError|notifyWarning(titleKey, descKey?, params?)`,
  `notifyInfo = notify`, via `sonner` (`:17`).
- F28 Theme: `main.tsx:108` `ThemeProvider attribute="class" defaultTheme="light" enableSystem`. Tokens:
  `tailwind.config.ts:58-…` semantic HSL colours, `:255-277` Spotlight width/spacing/ratio/shadow/radius tokens,
  `--radius: 0.5rem` (`index.css:43`), dark set under `.dark` (`index.css:230-…`), `--sp-card-radius 1.125rem`,
  `--sp-elevation-1/2` (`index.css:193-196`), `--status-*` (`:202-…`).
- F29 i18n keys already present in all 11 locales and usable without touching `src/` (checked per locale on
  origin/main, 2026-10-13): `screens.ui.close` (`de/screens.json:8477`), `screens.ui.failedLoadData|updating|offline|
  reconnecting|learnMore` (`de/screens.json:8455-8485`), `common.save|cancel|delete|close|select|loading|more|done|
  retry|search|next|back|yes|no` (`de/common.json:6-28`).
- F29b Close buttons on the web sit at the **physical** right in every direction: `dialog.tsx:69` (`right-4 top-4`),
  `sheet.tsx:71` (`right-4 top-4`), `responsive-dialog.tsx:128-130` (`right-2 top-1` on phones),
  `responsive-popover.tsx:160-168` (`justify-between` header, `-mr-2`). In Arabic they therefore stay on the right
  instead of the inline end (SR-19, F30).

**Spotlight contract (`docs/design-system/SPOTLIGHT_RULES.md`)**
- F30 `:118`: `src/components/ui/**` primitives are exempt from the `design/*` lint; SR-17 (`:83-84`) colours, radii,
  elevation only from tokens; SR-19 (`:92-93`) logical properties only; SR-22 (`:99`) only a 150 ms cross-fade, none
  under reduced motion; SR-29 (`:111`) WCAG 2.2 AA; SR-09 (`:64`) content items render through `VCard`.
- F31 `hooks/useSpotlightEnabled.ts:9, 49-50`: "Phones (< 1024 px) never get Spotlight". `ScreenFrame`
  (`layout/spotlight/ScreenFrame.tsx:2-5, 39-56`) composes SubNavigation/StandardHeader/UtilityActionButton/SplitBar —
  shell components, not primitives. `VCard` (`ui/vcard/VCard.tsx:18-48`) is imported by 53 non-test files, essentially
  all in `spotlight/` or `desktop/` component folders.

## Changes (numbered)
**A. Placement and dependencies**
1. **The kit lives in `apps/mobile/src/ui/`**, exported from `src/ui/index.ts` and imported as **`@vitana/ui`** (a
   `tsconfig.json` `paths` alias, which Metro resolves through Expo's built-in tsconfig-paths support, plus a matching
   jest `moduleNameMapper`). Not a `packages/ui` workspace: workspaces are decided by the Wave 1 extraction plan (F1,
   Wave 0 plan change 1); the alias makes a later move a one-line change for every consumer.
2. **Two new exact-pinned dependencies**, nothing else:
   - `react-native-svg 15.15.4` — the version SDK 57 bundles (F8), so `deps:check` stays green;
   - `lucide-react-native 1.48.0` (F9) — the web's icon family, React-19-compatible. Used by the kit for `X`, `Check`,
     `ChevronDown`, `ChevronUp`, `Circle`, `Minus` only. If a newer patch is ≥14 days old at implementation, the PR
     pins that one and records the date.
   - **Not added:** `@gorhom/bottom-sheet` (not SDK-bundled, F8), `@react-native-community/slider` (single-thumb
     native control; web semantics are a `value[]`), `nativewind` (F10, see change 4), `expo-haptics`, `expo-image`.
     Sheets, slider, popover and toasts are built on Reanimated 4.5.1 + Gesture Handler 2.32.0, already pinned (F1).
3. `jest.setup.ts` (via `setupFiles`): the Reanimated and Gesture Handler jest setups as each library documents them
   for these versions, and a `react-native-svg` mock if RNTL needs one. `I18nManager.isRTL` is overridable per test.
4. **Styling engine: `StyleSheet` + tokens, no NativeWind dependency.** Primitives take `style` (and per-slot style
   props where the web uses a second class prop, e.g. `overlayStyle` for `overlayClassName`). `className` is not
   accepted in v1. Whether screens adopt NativeWind is a separate decision (Open question 1); the kit does not block it.

**B. Tokens interface (`@vitana/tokens`) and theme**
5. `src/ui/theme/tokens-stub.ts` is the **module shape N1 must export** (see Interfaces): `TOKENS_VERSION`,
   `type VitanaTokens`, `tokens: VitanaTokens`. The stub copies the values the primitives use from `index.css` `:root`
   and `.dark` (F28), each group with a `file:line` provenance comment, colours as React-Native-parsable `hsl(h, s%, l%)`
   / `hsla(…)` strings. Alias `@vitana/tokens` → the stub in `tsconfig.json` `paths` and jest `moduleNameMapper`.
   It is temporary: when N1 lands, N1's PR (or a follow-up of this lane) points both aliases at the package and deletes
   the stub. N2 code imports tokens only through `src/ui/theme/index.ts`, so nothing else changes.
6. `src/ui/theme/legacy-literals.ts`: the raw colours the web primitives still use (F12 `solid/soft/pill`, F13
   `success`, F22 select trigger, F25 progress gradient), each with its web `file:line`. Mirroring them keeps the
   phone UI identical (SR-17 exempts `ui/**`, F30). Listed for N1 to turn into named tokens later; a test forbids
   colour literals anywhere else in `src/ui/**`.
7. `VitanaUIProvider` (`src/ui/provider/`): `colorScheme: 'light' | 'dark' | 'system'` (default **`'light'`**,
   mirroring `defaultTheme="light"` F28; N3 passes the member's setting), optional `tenant`, optional `direction`
   override (default `I18nManager.isRTL`). It renders `GestureHandlerRootView`, the overlay stack and the toast host
   **only once per tree**: an internal `UIRootContext` flag marks the outermost provider. A nested provider (e.g. the
   catalogue, change 31, wrapping itself inside N3's root provider) renders no second `GestureHandlerRootView`, overlay
   stack or toast host; it only overrides the theme values it is given (`colorScheme`, `direction`), so there is
   exactly one theme context in effect at any point and one host per app.
   Hooks: `useTheme()` → `{ scheme, colors, radius, space, type, elevation, motion }`, `useDirection()`,
   `useReducedMotion()` (OS setting; SR-22).

**C. Foundation**
8. `Text` (foreground colour, token type scale, `allowFontScaling` on, `writingDirection` from direction) and
   `Slot` (`asChild`: clones the single child, merges `onPress`, `style`, `disabled` and accessibility props — 152 web
   uses, F11). Web→native prop map for the port: `onClick`→`onPress`, `className`→`style`, `aria-label` /
   `aria-*` / `role` pass through (React Native 0.86 core accepts them), `id`+`htmlFor`→`nativeID`+
   `accessibilityLabelledBy`.
9. **Overlay stack** (`src/ui/overlay/`): every overlay renders in a transparent React Native `Modal` (the native
   portal), with `GestureHandlerRootView` inside (Android), `onRequestClose` → `onOpenChange(false)` (Android back),
   `accessibilityViewIsModal`, focus moved to the title on open (`AccessibilityInfo.setAccessibilityFocus`), safe-area
   insets, `KeyboardAvoidingView` for sheets with inputs. It keeps a ref-counted **ORB suppression count** incremented
   by exactly the overlays that suppress on the web — Dialog, Sheet, Drawer, ResponsiveDialog (F20) — exposed as
   `useOrbSuppressed()` and `subscribeOrbSuppression()` for N3/N6.
   **Cross-cutting close-button rule:** every native overlay that has a close button (Dialog incl. its
   NoAnimation/NoOverlay aliases, Sheet, Drawer, ResponsiveDialog, ResponsivePopover, toasts) places it at the **inline end**
   (`end`, never `right`), so it flips in Arabic. The web uses physical `right-*` (F29b); this is a documented native
   difference, recorded in the README with the web defects (change 33).
10. Motion: open/close as on the web (fade + scale for dialogs, slide for sheets) through Reanimated; all of it off
    when reduced motion is on (SR-22).

**D. Primitives (each mirrors the web export names; only the phone branch where the web has two)**

| # | Native module (`src/ui/…`) | Web source (F) | Native realisation | Notes |
|---|---|---|---|---|
| 11 | `button` (`Button`, `buttonStyles(variant,size)`) | F12 | `Pressable`, pressed state instead of hover | all 9 variants, 5 sizes, `asChild`, `disabled`; 44 pt hit area via `hitSlop` for `xs`/`sm`/`icon` |
| 12 | `badge`, `card` (6 parts) | F13 | `View`/`Text` | `CardTitle` role header |
| 13 | `input`, `textarea`, `label` | F11 | `TextInput`; `Label` → `nativeID` link | `placeholder` stays a prop (lint-checked) |
| 14 | `separator`, `skeleton` | F11 | `View`; pulse via Reanimated | static under reduced motion |
| 15 | `dialog` (+`DialogContentNoAnimation`/`NoOverlay` aliases) | F14 | centred modal, full width, square corners on a phone | close label `screens.ui.close`; aliases kept so ports compile, behaviour = no animation / no backdrop |
| 16 | `alert-dialog`, `responsive-confirm-dialog` | F18 | centred / bottom-sheet confirm | Action/Cancel 48 pt tall like the web phone branch |
| 17 | `sheet` | F15 | slide-in panel, `side` top/bottom/left/right with web (physical) semantics, plus `start`/`end` | drag-to-dismiss on the slide axis |
| 18 | `bottom-sheet` (internal core) + `drawer` (vaul API) + `responsive-dialog` + `responsive-popover` | F16–F18 | one Reanimated + Gesture Handler sheet: handle, drag to dismiss (past 30 % height or fast fling), `max-height = screen − 24`, bottom inset, sticky header/footer, scrollable body; `fullscreenOnMobile`, `hideCloseButton`, `title` | `shouldScaleBackground` accepted and ignored (the web never scales, F16) |
| 19 | `popover` | F21 | anchored via `measureInWindow`, `side`/`align`/`sideOffset`, clamped to the safe area, flips when there is no room; `align` start/end follow direction | backdrop tap closes |
| 20 | `tooltip` → **long-press hint** | F21 | `TooltipTrigger` long-press shows the content bubble anchored like a popover, hides on release/timeout; a string content is also set as `accessibilityHint` | `TooltipProvider` accepted (`delayDuration` ignored) |
| 21 | `tabs` | F21 | roles `tablist`/`tab`, `selected` state | `TabsContent` renders only the active value |
| 22 | `select` | F22 | trigger like the web; content opens as a bottom-sheet list with a check on the selected item (system-sheet pattern, a documented native difference from `position="popper"`) | `SelectValue placeholder`, groups, labels, separators, disabled items |
| 23 | `switch` | F23 | custom track/thumb (same size as web), role `switch`; thumb travels toward the inline end, so RTL is correct by construction (web fix F23) | |
| 24 | `slider` | F24 | Gesture Handler pan on a token-styled track; `value[]`, `defaultValue`, `min`, `max`, `step`, `onValueChange`, `onValueCommit`, `disabled`; fills from the inline start | role `adjustable` + increment/decrement actions; thumb count: Open question 3 |
| 25 | `checkbox`, `radio-group` | F23 | roles `checkbox` (incl. `'indeterminate'` → `mixed`) / `radio` in a `radiogroup` | 44 pt hit area |
| 26 | `accordion` (+ `collapsible`) | F23 | `type single|multiple`, `collapsible`, `value`/`defaultValue`/`onValueChange`; height animation | `expanded` state on the trigger |
| 27 | `avatar` | F26 | `Image` with `onLoad`/`onError` → `AvatarFallback`; `delayMs` | the DiceBear/resize URL logic stays in web `lib` and arrives via `@vitana/core` (N1); N2 renders the URL it is given |
| 28 | `progress` | F25 | role `progressbar`, `accessibilityValue`; fill from the inline start (web uses a physical translate — confirmed in the RTL screenshot pass) | gradient colours from `legacy-literals` |
| 29 | `scroll-area` | F23 | `ScrollView`; a `ScrollBar orientation="horizontal"` child switches it to horizontal | native scroll indicators |

**E. Toasts**
30. One toast store with **three entry points mirroring the three web ones** (F27):
    - `notify`, `notifySuccess`, `notifyError`, `notifyWarning`, `notifyInfo` with the web signature
      `(titleKey, descKey?, params?)`, translated at display time through the `t` from `useI18n()` (F4);
    - `toast()` / `useToast()` with the shadcn shape (`{title, description, action, variant}`), limit 1, 5 s;
    - a `sonner`-compatible `toast` (`(msg)`, `.success/.error/.warning/.info/.dismiss`) under
      `@vitana/ui/sonner`, so the 64 direct `sonner` call sites port without rewriting their call shape.
    Host: top-centre under the top safe-area inset (both web toasters sit at the top on phones), `richColors`-style
    status colours from the `status.*` tokens, swipe up to dismiss. The host renders inside the **top-most open overlay**
    (or the root when none is open), so a toast is never hidden behind a native modal. Accessibility:
    `accessibilityLiveRegion="polite"` (Android) and `announceForAccessibility` (iOS).

**F. Catalogue screen (for visual parity later)**
31. `app/native-ui-catalogue.tsx` (route `/native-ui-catalogue`, no web namesake): every primitive in every variant,
    size and state (incl. disabled, error, open overlays launched by buttons, all toast kinds), with a light/dark
    switch and the current direction shown. Every section has a stable `testID` for later simulator screenshots and
    Maestro. It renders only when the app profile is `development` or `test-g1` (app config `extra.profile`), else it
    redirects to `/`. It wraps itself in `VitanaUIProvider` (a nested provider when N3's root one exists, change 7),
    so it does not depend on N3. Visible text uses **only these existing keys** (F29), listed once in
    `src/ui/catalogue-keys.ts` and nowhere else:
    - buttons, menu items, select options, tabs: `common.save`, `common.cancel`, `common.delete`, `common.select`,
      `common.more`, `common.next`, `common.back`, `common.yes`, `common.no`, `common.retry`
    - input/textarea placeholder and label: `common.search`
    - dialog/sheet titles and descriptions: `common.done`, `screens.ui.learnMore`
    - toasts: `notify('screens.ui.updating')`, `notifySuccess('common.done')`,
      `notifyError('screens.ui.failedLoadData')`, `notifyWarning('screens.ui.offline')`,
      `notifyInfo('screens.ui.reconnecting')`, shadcn `toast({ title: t('common.done') })`
    - progress/skeleton label: `common.loading`; every close button: `screens.ui.close` (also `common.close`)

    No section headings as raw text. The kit itself uses only `screens.ui.close`.
32. `parity/ledger.json` `native_only` gets `{ "path": "/native-ui-catalogue", "reason": "dev-only UI kit catalogue
    (N2 VTID); not a member screen" }` (F6, rule d).

**G. Documentation**
33. `apps/mobile/README.md` gets a "Vitana Native UI" section: where the kit lives, the `@vitana/tokens` contract and
    its stub, the web→native prop map (change 8 and the table above), the documented native differences (select as a
    sheet, tooltip as long-press, no hover, close buttons at the inline end) and how to open the catalogue. No new
    `.md` file.
34. The same README section has a **"Web defects found"** list. Each item has its web `file:line`, what the native kit
    does instead, and its status ("reported to the owner; own VTID only after its own sparring", not fixed in N2):
    - the slider draws one thumb even for a `[min, max]` range, so the age-range filter's second value cannot be
      dragged (`slider.tsx:21`, `FindMatchFilterSheet.tsx:149-155`, F24);
    - the progress bar fills from the physical left in RTL (`progress.tsx:20`, F25);
    - the drawer's `shouldScaleBackground` (default `true`, `drawer.tsx:7-15`) is inert because no
      `vaul-drawer-wrapper` exists (F16), so the prop promises a behaviour the app never shows;
    - close buttons stay on the physical right in Arabic (F29b).

    The PR body repeats this list for the owner.

## Interfaces for other lanes
- **N1 (`@vitana/tokens`)** must export exactly:
  ```ts
  export const TOKENS_VERSION: string;
  export type ColorScheme = 'light' | 'dark';
  /** React Native shadow style (iOS shadow* + Android elevation). */
  export type ShadowStyle = {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  export type TenantId = 'maxina' | 'alkalma';
  export interface SemanticColors {           // RN-parsable colour strings
    background; foreground; card; cardForeground; popover; popoverForeground;
    primary; primaryForeground; secondary; secondaryForeground; muted; mutedForeground;
    accent; accentForeground; destructive; destructiveForeground; border; input; ring;
    statusSuccess; statusSuccessSubtle; statusWarning; statusWarningSubtle;
    statusError; statusErrorSubtle; statusInfo; statusInfoSubtle;
  }                                            // all: string
  export interface VitanaTokens {
    color: Record<ColorScheme, SemanticColors>;
    tenants?: Partial<Record<TenantId, Partial<Record<ColorScheme, Partial<SemanticColors>>>>>;
    radius: { sm: number; md: number; lg: number; xl: number; '2xl': number; full: number; vcard: number; vcardSm: number };
    space: (steps: number) => number;          // 4 px scale (SR-15)
    fontSize: { xs: number; sm: number; base: number; lg: number; xl: number; '2xl': number };
    fontFamily: { sans: string | undefined; editorial: string };
    elevation: Record<ColorScheme, { e1: ShadowStyle; e2: ShadowStyle; sm: ShadowStyle; md: ShadowStyle; lg: ShadowStyle }>;
    motion: { crossFadeMs: 150; sheetMs: number; dialogMs: number };
  }
  export const tokens: VitanaTokens;
  ```
  and pass `tests/ui/tokens-contract.test.ts` (every key present for light and dark, every colour accepted by React
  Native's `processColor`, every `ShadowStyle` with all five fields, finite numbers and a parsable `shadowColor`).
  **Alignment with N1's plan (`n1-plan.md` change 10):** N1 generates `resolved.light/dark` (hex + hsl), `radius`,
  `spacing`, `shadows` as raw CSS plus a parsed `{ color, opacity, offsetX, offsetY, blur }`, `fonts`, `tenants`, and
  hand-written `themeVars`/`color`/`tenantBrand`. N1's exports stay as they are; this interface is the contract N1
  must **additionally** satisfy. Delta for N1:
  - export `TOKENS_VERSION`, the types above and `tokens: VitanaTokens`, assembled in N1's hand-written `index.ts`
    from its generated data (no new generator input);
  - `ShadowStyle` is derived from N1's parsed shadow: `shadowColor = color`, `shadowOpacity = opacity`,
    `shadowOffset = { width: offsetX, height: offsetY }`, `shadowRadius = blur / 2`, `elevation` = a fixed mapping
    per token (`e1 → 2`, `e2 → 6`, `sm → 1`, `md → 3`, `lg → 8`), recorded in N1's config. The name `ShadowStyle` is
    used for the React Native form; N1's parsed form keeps its own name;
  - `SemanticColors` keys are camelCase views of N1's `resolved` names (`status-success-subtle` →
    `statusSuccessSubtle`);
  - `tenants` is a colour-override view of N1's `tenants`/`tenantBrand`;
  - N1 lists "N2 (NativeWind preset)" as a consumer of `tailwind-theme.generated.json`; N2 does not use NativeWind in
    v1 (change 4, Open question 1), so that output has no N2 consumer yet. Pillar (`pill.*`), `sys.*`, `category.*`, `severity.*` and `surface.*` groups may be added
  by N1 as optional fields; the primitives do not read them. N1 also absorbs `legacy-literals.ts` into named tokens.
- **N3 (shell, auth, i18n):** mounts `<VitanaUIProvider colorScheme={memberSetting}>` in `app/_layout.tsx` (inside
  `SafeAreaProvider` and `I18nProvider`), loads fonts (`expo-font`, Cormorant per program decision 8) and passes the
  family names through tokens; builds MobileModePill, TopAppBar, BottomNav, SideDrawer, RoleSwitcherSheet from these
  primitives (MobileModePill on the web uses `Sheet`). If N3's i18n replaces Wave 0's `useI18n()`, the toast
  translator is the only kit dependency on it.
- **N6 (ORB native):** hides the ORB FAB while `useOrbSuppressed()` is true (the web's `body[data-dialog-open]`, F20).
- **N4 (push):** a foreground push may surface through `notify*`/`toast()`; no other coupling. **N5 (Health Sync
  UI):** consumes `Switch`, `Progress`, `ResponsiveDialog`, `Button`.
- **Wave 2 lanes:** components outside this list are built on demand inside the lane that first needs them (program
  §5 row 2); see Out of scope.

## Tests
- **Per primitive (`tests/ui/<primitive>.test.tsx`, jest-expo + RNTL):** renders every variant/size; interaction
  contract with the web prop names (`onPress`, `onOpenChange`, `onValueChange`, `onCheckedChange`, `onValueCommit`,
  controlled and uncontrolled); accessibility — role, `accessibilityState` (disabled/checked/selected/expanded/busy),
  `accessibilityValue` (slider, progress), label passthrough (`aria-label` and `accessibilityLabel`), close button
  labelled with `screens.ui.close`, 44 pt minimum hit area on small controls; one **LTR and one RTL snapshot**
  (`I18nManager.isRTL` mocked true + provider direction `rtl`) and a **dark snapshot**.
- **Behaviour specifics:** overlays call `onOpenChange(false)` on Android back and backdrop tap; the bottom sheet
  dismisses past the threshold and springs back under it (gesture simulated with Gesture Handler's jest utilities);
  the ORB suppression count rises and falls only for Dialog/Sheet/Drawer/ResponsiveDialog and survives nesting;
  popover placement flips and clamps (pure placement function tested with numbers, incl. RTL `align`); switch thumb
  and slider fill run toward the inline end in RTL; slider `step`/`min`/`max` clamping and adjustable actions;
  `checkbox` `'indeterminate'` → `mixed`; **close buttons**: for Dialog, Sheet (all four sides), Drawer,
  ResponsiveDialog (sheet and fullscreen), ResponsivePopover and the toast, the LTR snapshot shows the close button
  with `end` positioning and the RTL snapshot shows it at the inline end, and the test asserts `right`/`left` are never
  set; **provider nesting**: a root provider renders exactly one `GestureHandlerRootView`, overlay stack and toast
  host; a provider nested inside it renders none of them, its `colorScheme`/`direction` override applies inside its
  subtree only, and a toast fired inside the nested subtree appears once (in the root host); a provider alone (the
  catalogue without N3) renders all three once; toast limit 1 / 5 s for `toast()`, the `notify*` key translation and `de`
  fallback, the sonner-compat API, toast host inside the top-most overlay; reduced motion disables animations.
- **Static guards (`tests/ui/guards.test.ts`, reading `src/ui/**` source):** no physical style keys (`marginLeft`,
  `paddingRight`, `left:`/`right:`, `borderLeftWidth`, `textAlign: 'left'|'right'`, …) except the documented
  physical-side mapping in `sheet`; no colour literals outside `theme/legacy-literals.ts` and the tokens stub; every
  i18n key the kit uses exists in all 11 locales (via Wave 0's catalog map); no import of any network module or
  `src/config/env.ts`.
- **Tokens contract (`tests/ui/tokens-contract.test.ts`):** runs against whatever `@vitana/tokens` resolves to (stub
  now, N1's package later).
- **Port fixtures (`tests/ui/port-fixtures.test.tsx`):** real web call sites rewritten with the prop map —
  `FindMatchFilterSheet.tsx:149-155` (range slider), a `ResponsiveDialog` with header/body/footer, a `Select` with
  placeholder, `DialogTrigger asChild`, a `notify()` call — must typecheck and render. These prove "same props".
- **Catalogue (`tests/ui/catalogue.test.tsx`):** renders under `development`, redirects under any other profile, every
  section `testID` present, no raw text (the i18n ESLint rule also runs in PR-GATE); every key in
  `src/ui/catalogue-keys.ts` (change 31, toast keys included) resolves to a non-empty string that is not the key in
  **each of the 11 locales** without the `de` fallback; and every `t()`/`notify*()` key literal in the catalogue file
  is in that list.
- **CI:** existing NATIVE-CI only — `deps:check` (proves `react-native-svg` matches SDK 57), `typecheck`, `test`,
  `bundle` (proves Metro resolves `@vitana/ui`/`@vitana/tokens` and the Reanimated worklets build on iOS and
  Android), parity ledger `--check`. No workflow change. Root lint/test/build unchanged (no web file touched).
- **Later, not in this PR:** simulator/emulator screenshots of the catalogue in light/dark/LTR/RTL compared with the
  web components at 390×844 (STATUS row 8b; program §4 visual parity).

## Rollout
1. Spar this plan (same partner, at least two passes), then Gate 1; allocate the VTID citing the sparring record;
   create `scope.json` with the Meta paths.
2. One vitana-v1 PR in the order A → B → C → D → E → F → G. Local checks: `npm ci`, `deps:check`, `typecheck`, `test`,
   `bundle` in `apps/mobile`; `node scripts/native/parity-ledger.mjs --check`; root `npm run lint`. Push, open the PR,
   ready when green, merge. Parallel lanes editing `apps/mobile/package.json`/lock or `jest.config.js`: whichever
   merges second rebases and regenerates the lockfile with `npm install` in `apps/mobile` (no hand-merged lockfile).
3. Done at merge with green checks: nothing deploys, no staging suite, no Gate 2 (Autonomy Contract). Refresh the
   repowise and graphify indexes on the merged state.
4. Follow-up owned by N1/N2 jointly: switch the `@vitana/tokens` alias to N1's package and delete the stub (one small
   PR, gated by the tokens contract test).
5. Rollback: revert the PR; nothing outside `apps/mobile` changes.

## Out of scope
- Vitana components (MobileModePill, TopAppBar, BottomNav, SideDrawer, RoleSwitcherSheet, header chips), the root
  layout, font loading, the member's theme setting: **N3**.
- `ScreenFrame` and `VCard`/`VCardSkeleton`: Spotlight is off on phones (F31), so today's phone UI renders neither in
  any meaningful way; a native twin is built by the first Wave 2 lane that ports a phone screen rendering one
  (Open question 4). The contract's token, RTL, motion and accessibility rules (F30) do apply to every primitive here.
- Primitives used rarely or by single features, built on demand in the lane that needs them: `dropdown-menu`
  (+kebab), `context-menu`, `calendar`, `carousel`, `table`, `form`, `resizable`, `sidebar`, `alert`, `aspect-ratio`,
  `emoji-picker`, `voice-recorder`, `split-bar`, `utility-action-button`, the card-list helpers.
- The web primitives themselves (no `src/` edits). The web defects in change 34 are reported, not fixed; each gets
  its own VTID only after its own sparring.
- New i18n keys (a web deploy path); NativeWind adoption; device builds, screenshots, Maestro (row 8b); any network.

<!-- plan:end -->
