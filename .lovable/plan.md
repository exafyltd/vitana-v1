

# Compress Health Snapshot card to fit viewport

The card has excessive internal spacing that pushes the bottom pillar bars off-screen. Tightening paddings and margins will make it fit.

## Changes — `src/components/health/mobile/MobileHealthSnapshot.tsx`

| Location | Current | New |
|----------|---------|-----|
| Outer wrapper (line 58) | `mx-4 mt-1` | `mx-4 mt-0` |
| Card padding (line 60) | `p-6` | `p-4` |
| Header margin (line 68) | `mb-6` | `mb-3` |
| Header text (line 69) | `text-lg` | `text-base` |
| Score section margin (line 73) | `mb-6` | `mb-3` |
| Score font (line 86) | `text-6xl` | `text-5xl` |
| Status text margin (line 98) | `mt-3` | `mt-2` |
| Divider margin (line 132) | `my-4` | `my-3` |
| Pillar rows spacing (line 135) | `space-y-3` | `space-y-2` |

These are purely spacing/size reductions — no layout or logic changes. The card will compress ~80-100px vertically, fitting entirely within the viewport above the bottom nav.

