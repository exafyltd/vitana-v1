

# Improve text readability on event cards with busy images

## Problem
When an event's background image contains a lot of text or visual noise (like the "Dancing Filmevent" poster), the card's overlay text becomes hard to read because the current gradient overlay is too subtle.

## Solution
Strengthen the dark overlay gradient and add stronger text shadows to ensure card text is always readable regardless of the background image.

## Changes — `src/components/crossover/NewsCard.tsx`

### 1. Darken the gradient overlay (line 338)

Current:
```
from-black/70 via-black/35 to-black/10
```

New — heavier overlay that fades more gradually:
```
from-black/85 via-black/50 to-black/20
```

This darkens the bottom and middle of the card where all the text sits, while keeping the top relatively transparent so the image is still visible.

### 2. Strengthen text drop shadows (lines 405, 411, 430, 437)

- Title: increase shadow from `rgba(0,0,0,0.8)` → `rgba(0,0,0,1)` with a slightly larger blur
- Description: increase from `rgba(0,0,0,0.6)` → `rgba(0,0,0,0.9)`
- Author name and meta: increase from `rgba(0,0,0,0.5)` → `rgba(0,0,0,0.8)`

Single file, ~5 line tweaks.

