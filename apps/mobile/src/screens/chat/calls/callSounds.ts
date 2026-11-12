/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the call
 * tones, native twin of web `src/utils/callSounds.ts`: the same four sounds
 * (outgoing / incoming ringtone looped at 0.5 / 0.7, connected and ended beeps
 * at 0.3), one at a time (every play stops the others). Played through the
 * device port's `expo-audio` player; created on first use.
 */
import { getChatDevice, type SoundPlayer } from '../../../ports/chat-device';

export const CALL_SOUND_URLS = {
  outgoing: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  incoming: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  connected: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  ended: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
} as const;

type SoundName = keyof typeof CALL_SOUND_URLS;
const OPTIONS: Record<SoundName, { loop: boolean; volume: number }> = {
  outgoing: { loop: true, volume: 0.5 },
  incoming: { loop: true, volume: 0.7 },
  connected: { loop: false, volume: 0.3 },
  ended: { loop: false, volume: 0.3 },
};

let players: Partial<Record<SoundName, SoundPlayer>> = {};

function player(name: SoundName): SoundPlayer | null {
  try {
    if (!players[name]) players[name] = getChatDevice().createPlayer(CALL_SOUND_URLS[name], OPTIONS[name]);
    return players[name] ?? null;
  } catch {
    return null;
  }
}

function play(name: SoundName) {
  callSounds.stopAll();
  try {
    player(name)?.play();
  } catch {
    // A tone that cannot play never blocks the call (web logs and moves on).
  }
}

export const callSounds = {
  playOutgoingRingtone: () => play('outgoing'),
  playIncomingRingtone: () => play('incoming'),
  playConnectedBeep: () => play('connected'),
  playEndedBeep: () => play('ended'),
  stopAll() {
    for (const p of Object.values(players)) {
      try {
        p?.stop();
      } catch {
        // ignore
      }
    }
  },
  /** Tests: forget the players (a new fake device gets new ones). */
  __reset() {
    for (const p of Object.values(players)) p?.release();
    players = {};
  },
};
