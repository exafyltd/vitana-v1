# News Card Feature Badges Design

## Goal

Make every Vitana-authored card on the News screen identify both its source and the feature it opens: ORB plus “Vitana” on the left, and a consistent bright-blue feature badge with the feature’s navigation icon on the right.

## Approved mappings

| Card | Feature icon | Feature label | CTA |
| --- | --- | --- | --- |
| Vitana Index recommendation | `Activity` | `Vitana Index` | `Index ansehen` |
| Guided Journey recommendation | `Zap` | `Meine Reise` | `Meine Reise ansehen` |
| Match recommendation | `Users` | `Find a Match` | `Match ansehen` |

English copy is `Vitana Index` / `View Index`, `Guided Journey` / `View My Journey`, and `Find a Match` / `View Match`.

## Component design

`VitanaRecommendationHeader` owns the complete identity row. Its public API accepts a required typed feature value: `vitana-index`, `guided-journey`, or `find-a-match`. A single feature configuration maps each value to its Lucide icon and localized label key.

The left identity is always the 24 px Vitana ORB followed by the blue `Vitana` wordmark. The sparkle after `Vitana` is removed. The right badge always places the feature icon before the feature label and uses the same blue background and foreground classes across all three features.

The existing News card callers provide explicit feature identities:

- `WelcomeBackBanner` and the Index-centric did-you-know card use `vitana-index`.
- `PriorityOfDayBanner` uses `guided-journey`.
- Match and spotlight-performer feed cards use `find-a-match`.

## Interaction and copy

The Index card keeps its destination and changes its CTA label to `Index ansehen`. The Journey card remains a single accessible button and displays `Meine Reise ansehen` as its action line. A specific match card continues opening that match profile and changes its action label to `Match ansehen`.

Dismiss and overflow controls, backend acknowledgement, analytics, keyboard activation, and card destinations remain unchanged.

## Responsive behavior

The identity row may wrap on narrow screens. The ORB and `Vitana` remain together, and the feature badge remains an intact, non-wrapping pill. This preserves legibility without clipping either label.

## Testing

A Node regression test bundles and server-renders the real React header for all three feature values. It verifies the localized labels, exact navigation icons, shared blue treatment, and removal of the sparkle. The same regression checks each News card caller’s feature assignment and CTA translation key. Final verification runs the targeted regression, the existing News-feed ranker regression, and the production build.

