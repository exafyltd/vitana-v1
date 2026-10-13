---
paths:
  - src/pages/**
  - src/components/**
---

# Spotlight Design Contract — vitana-v1 (VTID-05107)

Every screen follows **`docs/design-system/SPOTLIGHT_RULES.md`** (owner-approved 2026-10-12). Read it before you add or
change a screen. In short:

- **One archetype per route.** Every route has one of nine archetypes in `src/design/screen-manifest.json`. When you add a
  page, run `npm run design:manifest` and review the archetype it guessed. `screen-manifest.test.ts` fails otherwise.
- **Chrome through ScreenFrame.** Compose a page with `<ScreenFrame archetype="…">`
  (`src/components/layout/spotlight/`). Never touch the sidebar, ORB, Soundscape, Language, profile/role switcher,
  search or shortcut bar. Never build an ad-hoc header, tab bar or toolbar.
- **Content through VCard** (`src/components/ui/vcard/`): four sizes with fixed media ratios, and exactly one `spotlight`
  card per feed, storefront, detail or dashboard screen.
- **Tokens only.** No raw Tailwind palette colours (use `status-*`, `severity-*`, `category-*`, `surface-*`, `primary`,
  `muted` …). No `h-[…]`/`w-[…]` sizes. Logical `start`/`end` only, so RTL works. Skeletons instead of page spinners.
- **Enforced at error level** by `eslint-rules/design/*` and the base-branch **Design ratchet** in PR-GATE. New files must
  be clean; migration PRs lower `scripts/ci/pr-gate/baseline/{design,eslint}.json`. The only escape hatch is
  `// design-allow-next-line: <reason>`.
- **Changing the contract** (an archetype, a card size, a token, a rule) is a plan change: spar it, get owner approval,
  then update the contract, the rules, the manifest and the baselines together.
