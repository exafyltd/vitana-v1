/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — what the `/assistant`
 * screen and its panels need beyond `src/ports/ui.tsx`: the kit `Label` and
 * button foreground colour, the lucide glyphs the web panels draw, and audio
 * playback for the voice preview / sample greeting (the web plays the
 * gateway's base64 audio with `new Audio('data:…')`; here `expo-audio`'s
 * player). One port so screen files never import `@vitana/ui` or
 * `expo-audio` directly (tests/ports.test.ts); kept out of
 * `src/ports/ui.tsx` so parallel lanes do not edit the same port file.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { AlertCircle, CheckCircle2, ExternalLink, Info, Play, RotateCcw, Shield, Volume2, type LucideProps } from 'lucide-react-native';
import { useTheme } from '@vitana/ui';

export { Label, useButtonForeground } from '@vitana/ui';

const GLYPHS = { AlertCircle, CheckCircle2, ExternalLink, Info, Play, RotateCcw, Shield, Volume2 } satisfies Record<string, ComponentType<LucideProps>>;

export type AssistantGlyph = keyof typeof GLYPHS;

/** A decorative lucide glyph (hidden from assistive tech, like the web's icons). */
export function AssistantIcon({ name, size = 16, color }: { name: AssistantGlyph; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = GLYPHS[name];
  return (
    <View testID={`assistant-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={color ?? colors.foreground} />
    </View>
  );
}

/**
 * Plays base64 audio (the gateway's `audio_b64` + `mime`) at `volume` (0..1).
 * Resolves when playback ends or fails; the player is released either way.
 */
export function playAudio(audioB64: string, mime: string, volume: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    const done = () => {
      try {
        player?.remove();
      } catch {
        /* already released */
      }
      player = null;
      resolve();
    };
    try {
      player = createAudioPlayer({ uri: `data:${mime};base64,${audioB64}` });
      player.volume = Math.min(Math.max(volume, 0), 1);
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) done();
      });
      player.play();
    } catch {
      done();
    }
  });
}
