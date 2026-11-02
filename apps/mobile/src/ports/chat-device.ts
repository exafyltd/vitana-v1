/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the device
 * capabilities the chat and the 1:1 call use, behind one port. Each replaces a
 * browser API the web chat calls:
 *
 *  - pickMedia: `expo-image-picker` library (pictures + videos, several) —
 *    the web composer's `<input type="file" multiple accept="image/*,video/*…">`
 *    (MessageInput.tsx:767-774) and the group paperclip;
 *  - putFile: XMLHttpRequest PUT of a picked file to a Supabase signed upload
 *    URL with progress events (web `putToSignedUploadUrl`, src/lib/fileUpload.ts);
 *  - copyText: React Native's Clipboard (web `navigator.clipboard.writeText`,
 *    MessageBubble.tsx handleCopy). A picture cannot be put on the clipboard
 *    without a native image-clipboard module, so `canCopyImages` is false and
 *    the web's own "unsupported" path is taken (chatImageActions.ts:150-156);
 *  - share: the system share sheet (web `navigator.share`, Share via other apps);
 *  - openUrl: the system browser / viewer (web anchor download / `target=_blank`);
 *  - useRecorder: the `expo-audio` recorder (web `MediaRecorder` in
 *    src/components/ui/voice-recorder.tsx);
 *  - createPlayer: an `expo-audio` player (web `new Audio(url)` in the voice
 *    bubble and src/utils/callSounds.ts).
 *
 * Usage strings (photos, camera, microphone) are registered in app.config.ts.
 * Unit tests register a fake device (`registerChatDevice`); no test touches a
 * picker, the microphone, the network or a speaker.
 */
import { useCallback, useRef } from 'react';
import { Clipboard, Linking, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

export type PickedFile = { uri: string; name: string; mimeType: string; size: number };
export type PickMediaResult = { status: 'picked'; files: PickedFile[] } | { status: 'cancelled' } | { status: 'denied' };
export type UploadProgress = { loaded: number; total: number; percentage: number };
export type ShareResult = 'shared' | 'cancelled' | 'failed';

export interface ChatRecorder {
  /** Asks for the microphone, then records. */
  start: () => Promise<'recording' | 'denied'>;
  /** Stops and returns the recording (null when nothing was recorded). */
  stop: () => Promise<{ uri: string; mimeType: string } | null>;
  /** Stops and throws the recording away. */
  cancel: () => void;
}

export interface SoundPlayer {
  play(): void;
  pause(): void;
  /** Stops and rewinds. */
  stop(): void;
  release(): void;
  /** Position / duration (seconds) and the end of playback. */
  onStatus(listener: (s: { currentTime: number; duration: number; playing: boolean; didJustFinish: boolean }) => void): () => void;
}

export interface ChatDevice {
  pickMedia(): Promise<PickMediaResult>;
  putFile(signedUrl: string, file: PickedFile, headers: Record<string, string>, onProgress?: (p: UploadProgress) => void): Promise<void>;
  copyText(text: string): void;
  canCopyImages: boolean;
  share(input: { message?: string; url?: string }): Promise<ShareResult>;
  openUrl(url: string): Promise<void>;
  useRecorder(): ChatRecorder;
  createPlayer(source: string, opts?: { loop?: boolean; volume?: number }): SoundPlayer;
}

function extOf(mime: string): string {
  const sub = mime.split('/')[1] ?? 'bin';
  return sub === 'jpeg' ? 'jpg' : sub === 'quicktime' ? 'mov' : sub;
}

async function pickMedia(): Promise<PickMediaResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied' };
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.9 });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const files = result.assets.map((a, i) => {
    const mimeType = a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg');
    return { uri: a.uri, name: a.fileName ?? `${a.type === 'video' ? 'video' : 'photo'}-${i + 1}.${extOf(mimeType)}`, mimeType, size: a.fileSize ?? 0 };
  });
  return { status: 'picked', files };
}

function putFile(signedUrl: string, file: PickedFile, headers: Record<string, string>, onProgress?: (p: UploadProgress) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (!onProgress || !e.lengthComputable) return;
      // Never 100 % before the server answered (web putToSignedUploadUrl).
      onProgress({ loaded: e.loaded, total: e.total, percentage: Math.min(99, Math.round((e.loaded / e.total) * 100)) });
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed (network)'));
    const body = new FormData();
    body.append('cacheControl', '3600');
    // React Native's FormData streams a local file from { uri, name, type }.
    body.append('', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    xhr.send(body);
  });
}

async function share(input: { message?: string; url?: string }): Promise<ShareResult> {
  try {
    const res = await Share.share({ message: input.message ?? input.url ?? '', url: input.url });
    return res.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch {
    return 'failed';
  }
}

function useExpoRecorder(): ChatRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const active = useRef(false);
  const start = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return 'denied' as const;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    active.current = true;
    return 'recording' as const;
  }, [recorder]);
  const stop = useCallback(async () => {
    if (!active.current) return null;
    active.current = false;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    return recorder.uri ? { uri: recorder.uri, mimeType: 'audio/mp4' } : null;
  }, [recorder]);
  const cancel = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    void recorder.stop().catch(() => undefined);
  }, [recorder]);
  return { start, stop, cancel };
}

function createPlayer(source: string, opts: { loop?: boolean; volume?: number } = {}): SoundPlayer {
  const player = createAudioPlayer(source);
  if (opts.loop !== undefined) player.loop = opts.loop;
  if (opts.volume !== undefined) player.volume = opts.volume;
  return {
    play: () => player.play(),
    pause: () => player.pause(),
    stop: () => {
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    },
    release: () => player.remove(),
    onStatus(listener) {
      const sub = player.addListener('playbackStatusUpdate', (s) =>
        listener({ currentTime: s.currentTime, duration: s.duration, playing: s.playing, didJustFinish: s.didJustFinish }),
      );
      return () => sub.remove();
    },
  };
}

export const expoChatDevice: ChatDevice = {
  pickMedia,
  putFile,
  copyText: (text) => Clipboard.setString(text),
  canCopyImages: false,
  share,
  openUrl: async (url) => {
    await Linking.openURL(url);
  },
  useRecorder: useExpoRecorder,
  createPlayer,
};

let device: ChatDevice = expoChatDevice;

export function getChatDevice(): ChatDevice {
  return device;
}

/** Tests register a fake; `null` restores the device. */
export function registerChatDevice(next: ChatDevice | null): void {
  device = next ?? expoChatDevice;
}
