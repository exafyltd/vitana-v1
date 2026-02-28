

## Plan: Restore Blurred Background to Audio Overlay + Fix Rings + Remove Orb Edge

### 1. Restore blurred dark background (`VitanaAudioOverlay.tsx`, line 223)
Change the overlay container from transparent to a frosted dark backdrop:
```
className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl"
```
This gives a dark, blurred overlay that hides the underlying screen content.

### 2. Fix soundwave rings (`OrbSoundwaveRings.tsx`) — full rewrite
- **Exponential spacing**: offsets `[18, 42, 86, 170]` — gap between ring 3→4 (~84px) is larger than rings 1+2+3 combined (18+24+44=86)
- **No hard borders**: Replace `border: 1.5px solid ${color}` with a soft glow band using `box-shadow` with the state color and progressive blur (3px → 14px)
- **Same color throughout**: ring color matches the glow — no contrasting edge color
- Keep same state colors and animation logic

### 3. Remove orb hard edge (`VitanalandPortalSeed.tsx`)
- Find the shell border style and set `border: 'none'`
- Remove or hide the inner rim border element
- Only for the `lg` size used in the overlay (not the `nav` size mobile orb)

### Files
- **Edit**: `src/components/audio/VitanaAudioOverlay.tsx` — add `bg-black/85 backdrop-blur-2xl` to overlay
- **Edit**: `src/components/audio/OrbSoundwaveRings.tsx` — exponential spacing, soft glow bands
- **Edit**: `src/components/audio/VitanalandPortalSeed.tsx` — remove shell border for lg size

