# @vitana/tokens

VTID-05183 (Native app Wave 1, N1). The native app's design tokens, **generated** from the web's own sources so web
and native share one source:

| Source | What is read |
|---|---|
| `src/index.css` | the first `@layer base` `:root` (light) and `.dark` rules — every custom property |
| `tailwind.config.ts` | `theme.extend` colours, radii, max widths, spacing, shadows, aspect ratios, fonts; `theme.screens` |
| `tokens.config.json` | the gradient class rules to read, the `excluded` web-only variables and the `runtimeVars`, each with a reason |

Never edit `src/tokens.generated.ts` or `tailwind-theme.generated.json`. Change the web source (a Spotlight contract
change, `src/index.css` first), then run from the repo root:

```bash
node scripts/native/gen-tokens.mjs          # rewrite the outputs
node scripts/native/gen-tokens.mjs --check  # what NATIVE-CI runs: fails on any drift
```

Every custom property declared anywhere in `index.css` must be a token or listed in `excluded` with a reason, so a
new token can never be silently missed. Tenant brand colours come from `@vitana/core/tenants` (`tenantBrand(slug, registry)`),
which `themeVars(scheme, brand)` overlays as `--brand-accent/-bg/-fg`, as the web does at runtime.

Exports: `cssVars`, `colors`, `resolved`, `resolvedHsl`, `radius`, `spacing`, `maxWidth`, `shadows`, `fonts`,
`screens`, `gradients`, `aspectRatio`, `runtimeVars`, `themeVars(scheme, brand?)`, `color(name, scheme)`.
`tailwind-theme.generated.json` is the web `theme.extend` colour/radius/spacing map (same `hsl(var(--x))` values) for
the NativeWind config (N2), so native class names equal web class names.
