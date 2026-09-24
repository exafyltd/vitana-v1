# Screen registry (voice navigation)

The single list of screens Vitana can take a member to. Owner decision
2026-09-24 (navigation rebuild, `exafyltd/vitana-platform`
`docs/navigation-rebuild/PLAN.md`): this file set is the source of truth;
the Command Hub navigator can only add **tenant overrides** on top.

| File | Holds |
|---|---|
| `screens.json` | Every screen: id, desktop `route`, `mobileRoute`, `viewport`, `overlay`, `params`, `access`, English + German `title` / `shows` / `phrasings` |
| `locales/<code>.json` | Titles for es, fr, sr, pl, pt, ru, tr, ar, zh |
| `exclusions.json` | App routes that are deliberately not voice destinations, each with a reason |
| `index.ts` | Typed access for app code |

The build publishes the merged registry as `/nav-registry.json`
(`scripts/nav/build-nav-registry.mjs`, run by `prebuild`).

## Adding or changing a screen

1. Add the `<Route>` in `App.tsx` as usual.
2. Add an entry to `screens.json`: the route the member **lands on** (not a
   redirect), a one-sentence `shows` in English and German describing what
   information is on the screen, and at least two phrasings per language
   for how people ask for it ("open …", "where can I see …").
3. Add its title to every `locales/<code>.json`.
4. Add golden cases for it in `exafyltd/vitana-platform`
   `services/gateway/test/nav-golden/golden-set.ts`.

A page that should never be a voice destination goes in `exclusions.json`
with a reason instead. `npm test` fails until one of the two is done.

Moving content from one screen to another means updating both screens'
`shows` and phrasings in the same PR.
