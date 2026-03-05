

## Fix: Calm the Waves — Only Animate on Speech Activity

### Problem
The water-wave ripples currently pulse continuously at all times, even when nobody is talking. This is visually stressful and semantically wrong — soundwaves should only appear when there's sound (VITANA speaking or user speaking).

### Changes

**File: `src/components/audio/VitanalandPortalSeed.tsx`**

Update the wave ripple section (lines 139-158) to be **conditionally active**:

- **Speaking**: Waves animate outward at moderate speed (~2.5s), opacity driven by `volumeLevel`
- **Listening**: Waves animate slowly (~4s), subtle opacity — user's mic is active
- **Processing / Idle / Error**: Waves **do not render** — no sound activity, no waves. The glow cloud alone provides the ambient state feedback.

The `waveDuration` line (109) and wave generation (126-132) will be adjusted so waves only mount when `audioState === 'speaking' || audioState === 'listening'`. This is a simple conditional around the existing wave map at line 140:

```tsx
{glowIntensity > 0 && (audioState === 'speaking' || audioState === 'listening') && waves.map(...)}
```

Additionally, slow down the wave speeds:
- Speaking: `3.5s` (was `2s`)
- Listening: `5s` (was `3s`)

This keeps the glow cloud, nebula, and aurora animations as the calm ambient effect, while waves only appear as a direct response to voice activity.

