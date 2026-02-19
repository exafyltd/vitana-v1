

## Fix Mic Button Colors and Status Text

### Issue 1: Mic Button Colors Are Inverted

**Current (wrong):** `AudioControls.tsx` shows RED when `micActive=true` (mic open) and neutral/white when `micActive=false` (mic muted). This is backwards.

**Correct behavior spec:**
- Mic OPEN (listening, unmuted) = neutral/white button with white `Mic` icon (default state on session start)
- Mic MUTED (not listening) = RED button with white `MicOff` icon + red ring

**File:** `src/components/audio/AudioControls.tsx` (lines 48-67)

Swap the color logic:
- `micActive` (open) gets the neutral card style: `bg-card/80 backdrop-blur-xl hover:bg-card border border-border/50`
- `!micActive` (muted) gets the red alert style: `bg-red-600 hover:bg-red-700 ring-4 ring-red-500/30`

Also swap the icon logic:
- `micActive` shows plain `Mic` icon (no pulse animation needed for "normal" state)
- `!micActive` shows `MicOff` icon in white on the red background

### Issue 2: Status Text Stuck on "Einen Moment..." During Listening

**Current (wrong):** `isSpeaking` maps to `audioState = 'processing'`, which renders "One moment..." / "Einen Moment...". After the AI finishes speaking and the session transitions to listening, the status should update to "I'm listening..." / "Ich hore dir zu".

The `audioState` mapping in `VitanaAudioOverlay.tsx` (line 80) maps `isSpeaking` to `'processing'`. This is correct for when the AI is actually speaking. However, the `AudioStatusText` component needs a new `'speaking'` state so we can distinguish AI-speaking from processing.

**Fix approach:** Add a `'speaking'` audio state:

- In `AudioStatusText.tsx`: Add a `speaking` status message -- in English: "VITANA is speaking..." / in German use existing translate key
- In `VitanaAudioOverlay.tsx` (line 80): Map `isSpeaking` to `'speaking'` instead of `'processing'`, so `'processing'` is only used for the actual thinking/processing phase

This ensures:
- While AI speaks: shows "VITANA is speaking..."
- While processing (thinking): shows "Einen Moment..." / "One moment..."
- While listening: shows "Ich hore dir zu" / "I'm listening..."
- Idle/ready: empty (orb speaks for itself)

### Technical Details

**Files to modify:**

1. `src/components/audio/AudioControls.tsx` -- Swap mic color/icon logic (lines 48-67)
2. `src/components/audio/AudioStatusText.tsx` -- Add `'speaking'` state to type and status messages
3. `src/components/audio/VitanaAudioOverlay.tsx` -- Map `isSpeaking` to `'speaking'` instead of `'processing'` (line 80)

