# VTID-04894 — Plan sparring record

- Final plan hash (sha256 of the text between the plan markers): `7a62a1682d05e4f993021bdd8515db66a83a07ecb664dc158585b804d7e1defd`
- Partner: independent `plan-sparring-partner` agent (read-only), 3 rounds (round 3 reviewed only how the owner's approval decisions 7–10 are implemented)
- Verdict: **converged**
- Owner approval: in chat, 2026-10-05, with decisions 7–10 (narrow MCP wording exception for the pre-login page, owner copy, four-step flow, "What is MCP?"). Recorded in `vtid_ledger.metadata.plan_sparring` (session fallback).
- Implementation notes against the plan: the hero has no eyebrow line (an earlier owner decision pinned in `CommercePortal.light-redesign.test.ts` removed the hero eyebrow); "Connect your AI agent" reuses the existing translated key `mcpConnect.cta` instead of a new `guest.connectCta`.

## Round 1 findings (partner)

- F1 major — `heroSubtitle` is shared with the signed-in `heroCopy()`; changing it rewrites the signed-in hero.
- F2 major — `src/lib/commerce-mcp.test.ts:108-111` pins the portal's MCP wiring and was missing from scope.
- F3 minor — guest `fetchMcpReady` wiring unspecified. F4 minor — layout shift when it resolves. F5 minor — stale comment. F6 minor — redundant "no MCP" coverage.

---

# Plan — Commerce: a promotional pre-login landing; the steps live only there

Change class: **standard** (frontend page + 11 locale shards + tests + staging spec; no backend, no route, no auth)
Repo: exafyltd/vitana-v1

<!-- plan:begin -->
## Owner request (2026-10-05, fixed)

1. The "Getting started is simple" three-step section belongs on the pre-login landing page, and only there.
2. Make the pre-login page promotional and motivational. It should tell a story — join the longevity economy, bring your business to Vitanaland — so a visitor wants to register.
3. Explain the simple one-step way to connect a business (the Commerce MCP connection).

## Verified current state

- The pre-login landing page is the guest branch of `/commerce`: `App.tsx:1813` `<AuthGuard allowGuest><CommercePortal /></AuthGuard>`, with the guest branches in `src/pages/CommercePortal.tsx`.
  - The hero (`!user ? (` at ~`:545`) has a title, subtitle, one CTA to `/commerce/join?redirectTo=/commerce`, and a hint.
  - Below the hero (~`:593`) the guest gets only `whatHappensNextSection`.
- `whatHappensNextSection` (`:321-345`, built from `STEPS` at `:80-84`) also renders for signed-in users inside the desktop-only merchant block (`<div className="hidden lg:block">`, ~`:615`). That second placement is what the owner wants gone.
- `/commerce-login` (`pages/portals/CommercePortalLogin.tsx`) is only the sign-in form; `/commerce/join` is sign-up. Neither is "the landing page".
- MCP readiness: `fetchMcpReady()` (`lib/commerce-mcp.ts:40`) is a public, unauthenticated GET of the gateway's protected-resource metadata. It is true on staging and false on production today (`COMMERCE_MCP_ENABLED` is off there). `CommercePortal` currently calls it only for signed-in users (`:203-208`).
- Owner rule VTID-04796 (`components/commerce/supplier-journey-language.test.ts`): no technical terms on the main supplier path. The regex includes `\bmcp\b`, and hero/steps keys are in the checked set.
- Pins that will move:
  - `CommercePortal.light-redesign.test.ts:~179-195`: the guest body contains `whatHappensNextSection`; keep that.
  - `CommerceJoin.oauth-first.test.ts:67-75`: exact EN `heroSubtitle`, `guestCta`, `guestCtaHint`, `howItWorksTitle`, step titles.
  - Staging spec `tests/e2e/staging/vtid-04271-commerce-guest.staging.spec.ts`: the guest hero section has exactly one button, and it leads to `/commerce/join?redirectTo=%2Fcommerce`.
- Locales present: de (source), en, es, fr, pl, pt, ru, sr, tr, zh, ar (RTL).

## Design

### A. Signed-in view: steps removed
Delete `{whatHappensNextSection}` from the signed-in desktop block, and update its comment (`:317-319`) to say it is guest-only. Nothing else in the signed-in view changes. That includes the MCP panel, SetupHub, orgs, connections and the manual card.

### B. Guest view: a story, top to bottom (all inside the existing `!user` branches)

1. **Hero (story opener).** The guest hero switches to NEW guest-only keys `guest.heroTitle` ("Join the longevity economy") and `guest.heroSubtitle` ("Bring your business to Vitanaland — to people who invest in living longer, healthier lives."). The existing `heroTitle`/`heroSubtitle` stay unchanged: `heroSubtitle` is also rendered by the signed-in `heroCopy()` (`CommercePortal.tsx:444`), and `heroTitle` is the fallback for a signed-in user without a first name (`:310-315`). Only the `!user` branch reads the new keys. The CTA and hint are unchanged: still exactly one button, still to `/commerce/join?redirectTo=/commerce`. A small amber eyebrow line above the title: "Vitanaland Commerce".
2. **"Why Vitanaland"**: three value cards, factual claims only, no invented numbers:
   - *A community that cares about longevity.* Members come to Vitanaland to live healthier, longer lives, and they look for products and services that help.
   - *Trust is built in.* Every business is checked before it goes live, so members know who they buy from. (True: verification and the "security, compliance and certification checks are never skipped" foot note.)
   - *Seen for what you offer.* Members find you through what they need. (Commission never influences ranking, standing rule 13c-4, but the card only says what is visible to a supplier.)
3. **"Connect in one step"**. Shown only when `mcpReady` is true. Wiring: a SEPARATE `useEffect` that runs only for guests (`if (user) return; void fetchMcpReady().then(setMcpReady);`). The existing signed-in effect (`:201-209`) is untouched, so the `commerce-mcp.test.ts:108-111` wiring pins stay exactly true. One small public GET per guest page load, the same as the signed-in path does; no caching. While `mcpReady` is null the section is not rendered and it fades in when true: a below-the-fold shift between two sections, accepted (no skeleton). Plain words, never "MCP":
   - "Copy one address into your AI assistant — Claude, ChatGPT or Gemini — and tell it about your business. It registers your business and adds your products for you. You confirm before anything goes live."
   - The assistants line reuses `SUPPORTED_ASSISTANTS`.
   - No address, no copy button for a guest: both need an account. The CTA here goes to the same sign-up link ("Get your address — join free").
   - When `mcpReady` is false (production today) the section is not rendered, so the page never promises what is not live.
4. **"Getting started is simple"**: the existing `whatHappensNextSection`, unchanged, guest-only.
5. **Closing band**: "Your business belongs in the longevity economy", followed by the same sign-up CTA. This is a separate section, so the hero still has exactly one button.

Layout: the existing amber/light Commerce skin, `motion` fade like the other sections, a mobile-first single column with a `sm:grid-cols-3` value grid. Logical properties only (RTL). Icons from lucide (HeartPulse, ShieldCheck, Sparkles / Bot). No new component file unless the guest JSX goes past about 80 lines, in which case it moves to `components/commerce/CommerceGuestLanding.tsx`.

### C. Copy
- New keys under `screens.commerceportal.guest.*`: `eyebrow`, `whyTitle`, `why1Title/Body`, `why2Title/Body`, `why3Title/Body`, `oneStepTitle`, `oneStepBody`, `oneStepWorksWith`, `oneStepCta`, `closingTitle`, `closingBody`.
- New `guest.heroTitle` and `guest.heroSubtitle`. The existing `heroTitle`, `heroSubtitle` and personalized hero keys are untouched (so the signed-in hero and the `CommerceJoin.oauth-first.test.ts` exact pins do not change).
- DE first, du-form, then EN, then the other 9 locales translated in the same PR. No `Sie/Ihr`.
- Every new key is added to `journeyStrings()` in the language test, so the no-"MCP" rule covers them.

### D. Tests
- **Vitest** `src/pages/CommercePortal.guest-landing.vtid-<VTID>.test.ts`:
  - the signed-in block no longer contains `whatHappensNextSection`; the guest branch still does;
  - guest order is hero → why → one-step (gated on `mcpReady`) → steps → closing;
  - the hero still has one CTA;
  - the guest `fetchMcpReady` runs only for guests;
  - EN and DE keys exist in all 11 locales;
  - no "MCP" in any guest key.
- `CommerceJoin.oauth-first.test.ts` exact pins stay unchanged (the existing keys keep their values). Keep `light-redesign` and `src/lib/commerce-mcp.test.ts:108-111` (portal wiring pins) green without edits.
- **Staging spec** `tests/e2e/staging/vtid-<VTID>-commerce-guest-landing.staging.spec.ts` (unauthenticated, read-only, no sign-in):
  - `/commerce` as a guest shows the hero, the three why-cards, the steps and the closing CTA;
  - on staging (MCP ready) the one-step section renders and contains no "MCP";
  - the hero has exactly one button.
  - The `04271` spec stays as is.
- `npm run i18n:inventory`; `docs/SCREEN_INVENTORY.md` is regenerated.

### E. What's New
No entry: the page is for prospective suppliers who are not signed in, not a feature a member notices. The PR says so.

### Scope
Files:
- `src/pages/CommercePortal.tsx` (optionally a new `components/commerce/CommerceGuestLanding.tsx`)
- `src/i18n/*/screens.json` (11 locales)
- `src/components/commerce/supplier-journey-language.test.ts`
- `src/lib/commerce-mcp.test.ts` and `src/pages/CommerceJoin.oauth-first.test.ts` (must stay green; edited only if a pin truly has to move)
- the new Vitest and staging spec
- `docs/validation/<VTID>/*`
- `docs/SCREEN_INVENTORY.md`

No backend, no route, no auth, no gateway change. Production gets it only through PUBLISH.

### Out of scope
- `/commerce-login` and `/commerce/join` design.
- Showing the MCP address to guests.
- Any signed-in Commerce UX beyond removing the steps.

## Owner decisions on approval (2026-10-05, fixed)

7. Narrow exception to the VTID-04796 wording guard: `MCP` is allowed on the pre-login Commerce promotional/educational page only. Technical implementation terms (Connector IDs, Provider IDs, OpenAPI, OAuth details, scopes, other developer terms) stay prohibited there too, and the normal supplier onboarding flow keeps the full guard. Update the guard test, do not remove it.
8. Main CTA stays non-technical: "Connect your AI agent".
9. Hero lines: "Join the longevity economy." / "Bring your business to Vitanaland." / "Connect once. Let your AI do the setup."
10. One-step section copy (owner's wording): title "Connect your business in one step"; "Vitanaland uses MCP to let your AI assistant connect directly to Commerce."; "Copy the Vitanaland MCP address into Claude, ChatGPT or another supported AI assistant. Once connected, your AI can help register your business, add your products or services, and guide you through onboarding."; "You stay in control — verification, legal terms and going live still require your confirmation." A visual 4-step flow: 1 Copy the Vitanaland MCP address · 2 Connect it to your AI assistant · 3 Tell your AI about your business · 4 AI does the setup. An expandable "What is MCP?": "MCP is a secure standard that lets your AI assistant connect to Vitanaland and perform approved business setup actions for you." The MCP URL stays hidden from guests.

## Implementation of the owner decisions (supersedes B.1, B.3, C and the language-test part of D above)

- **Hero (guest only):** `guest.heroTitle` "Join the longevity economy.", `guest.heroSubtitle` "Bring your business to Vitanaland.", and `guest.heroTagline` "Connect once. Let your AI do the setup." The tagline renders only when `mcpReady`. The single hero button reads `guest.connectCta` "Connect your AI agent" when `mcpReady`, else the existing `guestCta`. It always goes to `/commerce/join?redirectTo=/commerce`; after sign-up, a first-time supplier already gets the MCP panel opened (existing `CommercePortal.tsx:189-199` behaviour). Still exactly one hero button (04271 spec).
- **One-step section (guest, only when `mcpReady`):**
  - Keys `guest.oneStepTitle`, `oneStepLead` (the MCP sentence), `oneStepBody`, `oneStepControl`, `flow1`–`flow4`, `whatIsMcp` (the toggle label), `whatIsMcpBody`, and the button `guest.connectCta`.
  - The flow is a 4-item ordered list with numbers and arrows/connectors, `sm:grid-cols-4`, stacked on mobile, using logical properties.
  - "What is MCP?" is a `<button aria-expanded>` toggle, collapsed by default.
  - No URL, no copy button.
- **Guard test (`supplier-journey-language.test.ts`):** `TECHNICAL` (with `\bmcp\b`) and `journeyStrings()` stay unchanged for the normal onboarding flow. The new guest keys are NOT added to `journeyStrings()`. A new case checks every `screens.commerceportal.guest.*` string, EN and DE, against `GUEST_PAGE_TECHNICAL`. That is the same list minus `mcp`, plus `oauth`, `scope(s)`, `token`, `endpoint`, `api key`, `openapi`, `connector`, `provider id`. A third case asserts the exception is narrow: "MCP" appears in no `journeyStrings()` value. A comment cites the owner decision (2026-10-05, this VTID).
- The "Why Vitanaland" cards, the steps (guest-only), the closing band, and the signed-in removal are as above. The closing band button also uses `guest.connectCta` when `mcpReady`, else `guestCta`.
- Staging spec: on staging (MCP ready) the one-step section shows the MCP wording, the 4-step flow and the "What is MCP?" toggle (expand → explanation visible). The page shows no `https://…/mcp` address. The hero has one button reading "Connect your AI agent".
<!-- plan:end -->

## Planner responses — round 1

- F1 [major] ACCEPTED (option a). Guest-only keys `guest.heroTitle`/`guest.heroSubtitle`; the shared `heroTitle`/`heroSubtitle` keep their values (also the no-name signed-in fallback for the title).
- F2 [major] ACCEPTED. `src/lib/commerce-mcp.test.ts` added to scope; its `:108-111` pins stay true because the existing effect is not touched.
- F3 [minor] ACCEPTED. Separate guest-only `useEffect`.
- F4 [minor] ACCEPTED as tolerable, stated in the plan (no skeleton, fade-in).
- F5 [minor] ACCEPTED. Comment updated.
- F6 [minor] No action (harmless double coverage).
- Q2: no caching — one small public GET per guest load, same as signed-in; stated in the plan.

## Round 2 — partner disposition

F1–F6 closed (guest-only hero keys verified against CommercePortal.tsx:310-315,444,545-567; commerce-mcp.test.ts:108-111 and CommerceJoin.oauth-first.test.ts:66-67 pins stay true). No new findings.

## Verdict

CONVERGED after 2 rounds (standard, cap 3).

## Round 3 — partner review of the owner decisions' implementation

Guard narrowness verified (TECHNICAL/journeyStrings unchanged; guest.* checked separately against GUEST_PAGE_TECHNICAL); no false positives in owner copy or translations; hero keeps one button for the 04271 spec. Observation (not a finding): use \bscopes?\b and \btoken\b — adopted. No findings.

## Final verdict

CONVERGED after 3 rounds. Owner approval in chat 2026-10-05 with decisions 7–10. Final plan hash: 7a62a1682d05e4f993021bdd8515db66a83a07ecb664dc158585b804d7e1defd
