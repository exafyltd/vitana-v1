

## Replace TTS Welcome Audio with Pre-Recorded Files

### What changes

The "Play Welcome" button on the Maxina intro screen currently calls `google-cloud-tts` edge function to synthesize speech on-the-fly. We'll replace that with the two uploaded WAV files, selecting the correct one based on the current language.

### File operations

1. **Copy audio files to `public/sounds/intro/`**:
   - `user-uploads://WelcomeVitanaENG.wav` → `public/sounds/intro/maxina-welcome-en.wav`
   - `user-uploads://WelcomeVitanaGER-2.wav` → `public/sounds/intro/maxina-welcome-de.wav`

2. **Edit `src/pages/IntroExperience.tsx`**:
   - Remove the SSML constants (`MAXINA_WELCOME_SSML_EN`, `MAXINA_WELCOME_SSML_DE`) and the `supabase` import (if only used here for TTS)
   - Remove the `supabase.functions.invoke('google-cloud-tts', ...)` call block
   - Replace `handlePlayPauseAudio` logic: instead of calling the edge function, create an `Audio` element from the static file path:
     ```typescript
     const audioSrc = isGerman
       ? '/sounds/intro/maxina-welcome-de.wav'
       : '/sounds/intro/maxina-welcome-en.wav';
     const audio = new Audio(audioSrc);
     ```
   - Keep all existing play/pause/resume logic, the `onended → continueToMaxina()` behavior, the soundscape volume ducking, and the `isPreparingAudio` / `isPlayingAudio` states (though "preparing" will be near-instant now)
   - The language toggle button (`LanguageToggleButton`) is **not touched** at all

### What stays the same
- Language toggle button and its protocol — untouched
- Soundscape volume ducking during welcome audio
- Play/Pause/Resume toggle behavior
- Auto-navigate to portal after audio ends
- Skip intro button
- Keyboard shortcuts (Space/Esc)
- Video background, orb, all other UI

