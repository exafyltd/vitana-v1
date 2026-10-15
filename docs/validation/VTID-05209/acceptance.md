# VTID-05209 — Commerce profile: country and website prefilled (frontend)

Owner approval 2026-10-15 (Gate 1 yes). Sparring: `plan-sparring.md` (CONVERGED, 2 rounds, standard class).
One VTID across `exafyltd/vitana-platform` (gateway routes, merged first) and `exafyltd/vitana-v1` (this PR).

## Acceptance criteria

AC-1: Registration step 2 prefills the website from a confirmed business email (hint "From your email address") and, when Vitanaland can tell the country reliably, shows it as one line "Country: … · Change" instead of the list; nothing is written until Create.
  TEST: src/components/commerce/company-suggestions.vtid-05209.test.tsx ("registration step 2")
AC-2: A country the supplier picked, or a resumed draft's website and country, is never replaced by a suggestion; Change reveals the list.
  TEST: src/components/commerce/company-suggestions.vtid-05209.test.tsx ("Change reveals the list", "a resumed draft keeps")
AC-3: No reliable suggestion, or the suggestion route failing, keeps today's behaviour (the list with the browser preselect, empty website).
  TEST: src/components/commerce/company-suggestions.vtid-05209.test.tsx ("no reliable suggestion", "route failing")
AC-4: Business profile: with both values known it shows a summary (each value's source in plain words) with one Save that sends exactly the shown values; saved values always win; a missing value shows the inputs; Change shows the prefilled inputs.
  TEST: src/components/commerce/company-suggestions.vtid-05209.test.tsx ("business profile sheet")
  UI: tests/e2e/staging/vtid-05209-company-suggestions.staging.spec.ts (390x844 and 1280x900, read-only)
AC-5: AI setup review: country = what the AI read, else the website's country domain, else today's browser guess; never over a country already changed on the review.
  TEST: src/components/commerce/AiSetupSheet.tsx review fallback (code) + src/lib/commerce-ai-setup.test.ts (existing reviewFromDraft rules)
AC-6: All new copy in 11 locales (DE first, du-form); no raw strings; RTL-safe (logical classes only).
  TEST: i18n checks in CI (PR-GATE / i18n-check) + docs/SCREEN_INVENTORY.md regenerated
AC-7 (fix-forward, Codex review of #1429): a value typed while suggestions load is never replaced, the profile sheet never flips to the summary mid-edit, and an older suggestion answer arriving late never overwrites the latest one (registration and AI setup review).
  TEST: src/components/commerce/company-suggestions.vtid-05209.test.tsx ("a value typed while the suggestions load", "an older suggestion answer arriving late")

## UX acceptance (Commerce UX contract)
- User steps: unchanged (registration 2 steps; profile 1 sheet).
- Required fields: registration — name only when email domain + website domain resolve, otherwise as before.
- Decisions: country from ~200 → confirm or "Change" when reliable.
- Asked although inferable: none when a reliable source exists; the country is still asked when sources are missing or disagree (legally relevant).
- Next step always clear: yes — one dominant button per screen; each prefilled value names its source.
- Friction: down. No step or field added; nothing saved silently.
