

## Plan: Replace TTS Welcome Audio with Pre-recorded WAV File

### What
Replace the on-the-fly Google Cloud TTS call for the "Play Welcome" button on the Maxina Intro Experience screen with the uploaded pre-recorded German WAV file.

### Steps

1. **Copy the uploaded WAV file** to `public/sounds/vitanaland/WelcomeVitanaGER.wav`

2. **Modify `src/pages/IntroExperience.tsx`** — Refactor `handlePlayPauseAudio`:
   - When `isGerman` is true: play the static file `/sounds/vitanaland/WelcomeVitanaGER.wav` directly (no TTS API call needed)
   - When `isGerman` is false (English): keep the existing Google Cloud TTS flow as-is (or we can discuss adding an English file later)
   - Remove the TTS loading spinner delay for the German path since the file is local and instant

### Impact
- Eliminates TTS API cost and latency for the German welcome
- English welcome continues to use TTS until a pre-recorded English file is provided

