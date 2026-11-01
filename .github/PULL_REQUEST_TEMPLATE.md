## Summary

<!-- 1-3 sentences on what changed and why -->

## Test plan

- [ ] Local build passes (`npm run build`)
- [ ] Local lint passes (`npm run lint`)
- [ ] No new hardcoded user-facing strings (CI's `i18n-check` workflow is green)
- [ ] If new strings were added: ran `npm run i18n:inventory` and committed the updated `docs/SCREEN_INVENTORY.md`
- [ ] If new strings were added in a non-DE language only: ran `node scripts/translate-keys.mjs --provider=deepseek` to drain `_pending_review`
- [ ] If members will notice this change (new feature / redesign): added `src/whats-new/entries/<id>.json` (auto-publishes the News Feed card after prod deploy)
- [ ] Checked the change in this PR's preview (`PREVIEW-DEPLOY-FRONTEND.yml` posts its URL) or, after merge, on staging `https://preview-aws.vitanaland.com` — read-only on both (they use the production Supabase project)

## Verification

<!--
Tick what applies; write "n/a: <reason>" for the rest. Full list per change type:
exafyltd/vitana-platform .kiro/pipeline/quality-checks.md.
Say what was observed where. Never write "verified" for something only unit-tested:
write "not verified on staging: <reason>" and name the test that covers it.
-->

Change types: <!-- UI / Backend / Database / Integration / Infrastructure-CI / Tooling-docs -->

**UI**
- [ ] Screenshots of the changed element after the interaction at 1400×900 and 390×844 (or why there are none)
- [ ] Phone code path named: every component that renders this on a phone (`useIsMobile`, `MobileAppShell`, `Mobile*` pages, phone redirects)
- [ ] No hover-only control without a tap path; logical properties (`ms-`/`me-`/`start`/`end`), checked in ar (RTL)
- [ ] German first (du-form) and English; dates and numbers through `@/lib/locale-format`
- [ ] Keyboard reach, visible focus, accessible names for icon buttons, contrast (WCAG 2.2 AA)
- [ ] Empty, loading, error, offline and long-text states; late responses do not overwrite input or move the user's place

**Staging proof**
- [ ] `docs/validation/<VTID>/staging-tests.json` asserts this change's outcome (not only that the page loads), UTF-8 without BOM
- [ ] A new staging spec compiles and is listed (`npx playwright test --list <spec>`)

**Commerce supplier screens** (CLAUDE.md "Commerce UX contract")
- [ ] UX acceptance: user steps · required fields · decisions · anything Vitanaland or the AI could infer (none, or why) · next step always clear · friction up or down

Observed:
