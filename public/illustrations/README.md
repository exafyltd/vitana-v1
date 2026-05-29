# Journey illustrations

Drop curated AI-painted illustrations here. The components reference these
paths directly; while a file is missing, the soft pastel-sunrise CSS
gradient behind it shows through.

## Required assets

| Path | Used by | Aspect | Recommended size |
|---|---|---|---|
| `journey-coast.webp` | `DreamNorthStar` | 3 : 4 portrait | ~1200×1600, <200 KB |
| `future-self-stronger.webp` | `FutureSelfTiles` | 1 : 1.1 portrait | ~600×660, <100 KB |
| `future-self-calmer.webp` | `FutureSelfTiles` | 1 : 1.1 portrait | ~600×660, <100 KB |

## Style direction

- **Painted illustration** (gouache / watercolor / soft brushstrokes) — not photography.
- Soft **pastel palette**: blush pink, lavender, peach, soft blue, warm yellow.
- **Warm sunrise / golden-hour lighting** — never night, never cold blue.
- Calm, elegant, dreamy — fairy-tale, premium magazine quality.
- No close-up faces — silhouettes / distant figures so any user feels reflected.
- File format: `webp` preferred (smaller); `png` / `jpg` also work — change the import path.

## Generation prompts

### Hero (`journey-coast.webp`)

```
A dreamy painted illustration in a soft gouache watercolor style.
Vertical 3:4 composition. Pastel sunrise over a Mediterranean coast,
warm pink and peach sky melting into soft lavender, calm turquoise sea
on the left, distant pastel mountains and a small whitewashed coastal
village on the right with cypress trees. Two soft hot-air balloons
drifting in the upper left. Tiny sailing boat on the water. Flowers
blooming in the foreground left and right (pink dahlias, lavender,
sunflowers). Fairy-tale, magical, calm, emotional. Soft brushstrokes,
no photorealism, no people in the foreground. Golden hour light.
--ar 3:4 --style raw --v 6
```

### Future-self · Stronger (`future-self-stronger.webp`)

```
A dreamy painted illustration in soft gouache watercolor style.
Vertical 1:1.1 composition. A small silhouetted runner on a coastal
mountain path at sunrise. Pastel pink and peach sky, soft lavender
clouds, warm golden light catching the path. Wildflowers along the
trail. Movement, lightness, hope. No close-up faces, just a calm
silhouette in the distance. Same fairy-tale palette as the hero.
--ar 1:1.1 --style raw --v 6
```

### Future-self · Calmer (`future-self-calmer.webp`)

```
A dreamy painted illustration in soft gouache watercolor style.
Vertical 1:1.1 composition. A peaceful moonlit window seat at dusk,
soft lavender and powder blue sky, a single warm lamp inside, a
silhouetted figure resting with a book. Lavender stems in a vase.
Stillness, rest, comfort. Same fairy-tale palette as the hero,
slightly cooler. Soft brushstrokes, no photorealism.
--ar 1:1.1 --style raw --v 6
```

## Production sourcing

**V1 (now):** generate the three above with Midjourney / Sora / DALL·E,
human-pick the best of 4 grids, export to WebP, drop into this folder.

**V2 (after validation):** commission 3–5 painted variants per pillar
(vitality coast, mind mountain, nutrition garden, social city, finance
forest) so the hero reflects the user's life-compass focus. Wire to
`life_compass.pillar_focus` / `life_compass.category` in `DreamNorthStar`
to pick the right scene per user.
