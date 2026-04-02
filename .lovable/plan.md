

# Reorganize Discover Content Area Hierarchy

## Problem

The AI Picks content area feels flat — a featured card sits directly on top of a 2-column grid with no visual separation or hierarchy. The heading "AI Picks for You" redundantly echoes the utility rail pill. The layout lacks intentional structure.

## Changes

### `src/components/discover/MobileDiscoverView.tsx` — Suggested tab only

**1. Replace heading text:**
- Change `translate('discover.aiPicksForYou')` → `translate('discover.recommendedForYou')`
- Add translation keys `"recommendedForYou": "Recommended for you"` (en) / `"Für Sie empfohlen"` (de) to both i18n files

**2. Add clear visual separation between featured and grid:**
- After the featured card, insert a secondary section heading before the grid: a subtle label like `translate('discover.moreToExplore')` ("More to explore") styled as `text-xs font-medium text-muted-foreground uppercase tracking-wider` with a thin divider line
- Add translation keys for this secondary heading

**3. Featured card differentiation:**
- Give the featured card slightly more breathing room: `mb-1` after the section header, then the featured card, then `mt-4` gap before the secondary section
- The featured card already has `h-56` and `col-span-2` — keep those

**4. Grid section treatment:**
- Wrap the grid in a subtle container or just ensure the secondary heading creates enough visual break
- The grid cards (`h-48`) remain as-is — the hierarchy comes from the heading + spacing, not card redesign

### `src/i18n/en.json` and `src/i18n/de.json`

Add two new keys under `discover`:
- `"recommendedForYou"` — "Recommended for you" / "Für Sie empfohlen"
- `"moreToExplore"` — "More to explore" / "Mehr entdecken"

## Summary of visual result

```text
[ Recommended for you          See all > ]
┌──────────────────────────────────────┐
│  FEATURED HERO CARD (h-56, full-w)   │
│  image + gradient + title + provider │
│  reason chip + price + CTA           │
└──────────────────────────────────────┘

── More to explore ────────────────────

┌────────────┐  ┌────────────┐
│  Card 2    │  │  Card 3    │
│  (h-48)    │  │  (h-48)    │
└────────────┘  └────────────┘
┌────────────┐  ┌────────────┐
│  Card 4    │  │  Card 5    │
└────────────┘  └────────────┘
```

## Files changed

1. `src/components/discover/MobileDiscoverView.tsx` — heading text swap, add secondary section divider/heading with spacing
2. `src/i18n/en.json` — add `recommendedForYou`, `moreToExplore`
3. `src/i18n/de.json` — add German equivalents

