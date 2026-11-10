/**
 * VTID-05677 — the screen's one audio player, replacing the web global
 * `HTMLAudioElement` behind `useAudioPlayer` (`src/hooks/useAudioPlayer.ts:44-50`).
 * `playMedia` swaps the source, `pause` pauses it, `currentMedia` / `isPlaying`
 * drive the list rows. Playback state lives in the Media Hub screen and stops
 * when it unmounts (the app-global mini player is shell chrome, plan Open items).
 * Background playback stays off (the `expo-audio` plugin in `app.config.ts`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export interface PlayableMedia {
  id: string;
  title: string;
  creator: string;
  audioUrl: string;
  duration: number;
  mediaType: 'music' | 'podcast';
}

export function useMediaAudio() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const [currentMedia, setCurrentMedia] = useState<PlayableMedia | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const release = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    try {
      playerRef.current?.pause();
      playerRef.current?.remove();
    } catch {
      /* already released */
    }
    playerRef.current = null;
  }, []);

  const playMedia = useCallback(
    (media: PlayableMedia) => {
      release();
      void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
      const player = createAudioPlayer({ uri: media.audioUrl });
      playerRef.current = player;
      subRef.current = player.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(!!status.playing);
        if (status.didJustFinish) setIsPlaying(false);
      });
      setCurrentMedia(media);
      setIsPlaying(true);
      player.play();
    },
    [release],
  );

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  useEffect(() => release, [release]);

  return { currentMedia, isPlaying, playMedia, pause };
}
