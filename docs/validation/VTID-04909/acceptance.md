# VTID-04909 (frontend) — partner terms: German binding, language switcher, RTL

Pairs with exafyltd/vitana-platform VTID-04909 (gateway + migration, not applied). Owner decisions 2026-10-06: German binding and canonical; English second; 11 exact locales; German fallback; formal „Sie“ only for the contractual acceptance and the binding notice (C).

## What changes

- `src/lib/commerce-terms.ts`: reads the one-language answer (`locale`, `text`, `direction`, `fallback`, `available_locales`, German `binding`); defaults are German (were `'en'`); `TERMS_LOCALES` and endonym map `TERMS_LANGUAGE_NAMES`; `acceptBody` sends version + German hash + language on screen; `sameTermsVersion`; `termsBlocks()` renders headings / list items / markers / paragraphs as text nodes only.
- `PartnerTermsSheet.tsx`: one language at a time, switcher (only languages the version carries), permanent German-binding notice with a „read the binding German version“ link, fallback note, `lang`/`dir` on the text (Arabic rtl), version/date isolated for bidi, checkbox never pre-ticked next to Accept with the owner's explanation, Accept disabled until ticked; switching never accepts and keeps the tick unless the version changed.
- Catalog (all 11 shards): `bindingNotice` (§19 wording), `bindingShort`, `languageLabel`, `readGerman`, `fallbackNotice`, `agree`, `agreeExplanation`, `accept`; titles aligned with the legal text; removed `bindingLabel`/`translationLabel` (English-binding labels).
- `scripts/i18n-register-check.mjs`: `FORMAL_BY_DESIGN` exempts `agreeExplanation` and `bindingNotice` (owner decision C).

## Acceptance criteria

AC-1: German is shown by default (no preference / missing translation) and the German-binding notice is always visible.
  TEST: src/components/commerce/PartnerTermsSheet.vtid-04909.test.tsx
  TEST: tests/e2e/staging/vtid-04909-partner-terms-language.staging.spec.ts
AC-2: The supplier can read any available language; switching never changes the version/hash accepted and never accepts.
  TEST: src/components/commerce/PartnerTermsSheet.vtid-04909.test.tsx
AC-3: Arabic renders right to left; Latin identifiers stay intact.
  TEST: src/components/commerce/PartnerTermsSheet.vtid-04909.test.tsx
  TEST: tests/e2e/staging/vtid-04909-partner-terms-language.staging.spec.ts
AC-4: Checkbox never pre-ticked; Accept disabled until ticked; the explanation states authority to bind the Partner.
  TEST: src/lib/commerce-terms.vtid-04895.test.ts
  TEST: tests/e2e/staging/vtid-04909-partner-terms-language.staging.spec.ts

No What's New entry: nothing member-facing until terms are published.
