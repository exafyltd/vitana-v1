

## Fix: Nature Emoji Category Too Limited (Animals Only)

### Problem
The Nature category only contains 16 animal emojis. It should include plants, flowers, weather, and other nature-related emojis for variety.

### Fix

**File: `src/components/ui/emoji-picker.tsx`** — Expand the `nature` array to include flowers, plants, weather, and celestial emojis alongside the existing animals:

```
nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
         '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🍀', '🍁', '🍂', '🌾', '🌵',
         '☀️', '🌙', '⭐', '🌈', '☁️', '⛅', '🌊', '❄️', '🔥', '💧']
```

This adds ~25 plant/weather/nature emojis to the existing animals, making the category well-rounded.

### Files to modify
- `src/components/ui/emoji-picker.tsx` — expand `nature` array

