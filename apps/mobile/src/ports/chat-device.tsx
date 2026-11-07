/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the device
 * capabilities the chat and the 1:1 call use, behind one port. Each replaces a
 * browser API the web chat calls:
 *
 *  - pickMedia: the web composer's `<input type="file" multiple accept=
 *    "image/*,video/*,audio/*,.pdf,.doc…">` (MessageInput.tsx:767-774), whose
 *    phone chooser offers the photo library, the camera and files: the
 *    library and camera through `expo-image-picker`, files (pdf, Office,
 *    text, archives, audio…) through `expo-document-picker`;
 *  - putFile: XMLHttpRequest PUT of a picked file to a Supabase signed upload
 *    URL with progress events (web `putToSignedUploadUrl`, src/lib/fileUpload.ts);
 *  - copyText / copyImage: `expo-clipboard` (web `navigator.clipboard.writeText`
 *    and the picture copy of chatImageActions.ts copyImageToClipboard: the
 *    picture itself, not its link);
 *  - share: the system share sheet (web `navigator.share`, Share via other apps);
 *  - openUrl: the system browser / viewer (web anchor download / `target=_blank`);
 *  - useRecorder: the `expo-audio` recorder (web `MediaRecorder` in
 *    src/components/ui/voice-recorder.tsx);
 *  - createPlayer: an `expo-audio` player (web `new Audio(url)` in the voice
 *    bubble and src/utils/callSounds.ts);
 *  - VideoPlayerView: an `expo-video` view with the system controls (the web
 *    viewer's `<video controls autoPlay>`, ChatImageViewer.tsx:338);
 *  - DateTimeField: `@react-native-community/datetimepicker` (the web's
 *    `<input type="datetime-local">` / `type="date"`): Android opens the
 *    system date (then time) dialog, iOS shows the inline picker in a sheet.
 *
 * Usage strings (photos, camera, microphone) are registered in app.config.ts.
 * Unit tests register a fake device (`registerChatDevice`); no test touches a
 * picker, the microphone, the network or a speaker.
 */
import { useCallback, useRef, useState, type ComponentType } from 'react';
import { Linking, Modal, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ExpoClipboard from 'expo-clipboard';
import { useVideoPlayer, VideoView } from 'expo-video';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Button, Text, useUITheme } from './ui';
import { useI18n } from '../i18n/I18nProvider';

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

export type PickSource = 'library' | 'camera' | 'files';
export type DateMode = 'date' | 'time' | 'datetime';

export interface DateTimeFieldProps {
  value: Date | null;
  mode: DateMode;
  onChange: (next: Date) => void;
  placeholder: string;
  /** Shown value (the caller formats it in the member's language). */
  display: string;
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
}

export interface ChatDevice {
  pickMedia(source?: PickSource): Promise<PickMediaResult>;
  putFile(signedUrl: string, file: PickedFile, headers: Record<string, string>, onProgress?: (p: UploadProgress) => void): Promise<void>;
  copyText(text: string): void;
  canCopyImages: boolean;
  /** Fetches the picture at `url` and puts the picture itself on the clipboard. */
  copyImage(url: string): Promise<void>;
  share(input: { message?: string; url?: string }): Promise<ShareResult>;
  openUrl(url: string): Promise<void>;
  useRecorder(): ChatRecorder;
  createPlayer(source: string, opts?: { loop?: boolean; volume?: number }): SoundPlayer;
  VideoPlayerView: ComponentType<{ uri: string; testID?: string }>;
  DateTimeField: ComponentType<DateTimeFieldProps>;
}

function extOf(mime: string): string {
  const sub = mime.split('/')[1] ?? 'bin';
  return sub === 'jpeg' ? 'jpg' : sub === 'quicktime' ? 'mov' : sub;
}

/** The web input's accept list (MessageInput.tsx:771) as document-picker types. */
export const FILE_TYPES = [
  'image/*', 'video/*', 'audio/*', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'image/heic', 'image/heif',
];

async function pickFiles(): Promise<PickMediaResult> {
  const result = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, multiple: true, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  return { status: 'picked', files: result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', size: a.size ?? 0 })) };
}

async function pickMedia(source: PickSource = 'library'): Promise<PickMediaResult> {
  if (source === 'files') return pickFiles();
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied' };
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images', 'videos'], allowsMultipleSelection: source === 'library', quality: 0.9 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
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

function ExpoVideoView({ uri, testID }: { uri: string; testID?: string }) {
  const player = useVideoPlayer(uri, (p) => p.play());
  return <VideoView player={player} nativeControls contentFit="contain" style={styles.video} testID={testID} />;
}

function nativeDisplay(mode: DateMode): 'date' | 'time' {
  return mode === 'time' ? 'time' : 'date';
}

/** The system date / time picker behind a field that shows the chosen value. */
function ExpoDateTimeField({ value, mode, onChange, placeholder, display, minimumDate, maximumDate, testID }: DateTimeFieldProps) {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const openPicker = () => {
    const start = value ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: nativeDisplay(mode),
        minimumDate,
        maximumDate,
        onChange: (e, picked) => {
          if (e.type !== 'set' || !picked) return;
          if (mode !== 'datetime') return onChange(picked);
          DateTimePickerAndroid.open({ value: picked, mode: 'time', onChange: (e2, t) => e2.type === 'set' && t && onChange(t) });
        },
      });
      return;
    }
    setDraft(start);
    setOpen(true);
  };
  return (
    <>
      <Pressable onPress={openPicker} accessibilityRole="button" accessibilityLabel={placeholder} style={[styles.field, { borderColor: colors.input, backgroundColor: colors.background }]} testID={testID}>
        <Text muted={!value}>{value ? display : placeholder}</Text>
      </Pressable>
      {open ? (
        <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <RNDateTimePicker value={draft} mode={mode} display="spinner" minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_e, d) => d && setDraft(d)} />
            <Button
              onPress={() => {
                setOpen(false);
                onChange(draft);
              }}
            >
              {t('chatNative.composer.pickerDone')}
            </Button>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

export const expoChatDevice: ChatDevice = {
  pickMedia,
  putFile,
  copyText: (text) => void ExpoClipboard.setStringAsync(text),
  canCopyImages: true,
  copyImage: async (url) => ExpoClipboard.setImageAsync(await fetchBase64(url)),
  share,
  openUrl: async (url) => {
    await Linking.openURL(url);
  },
  useRecorder: useExpoRecorder,
  createPlayer,
  VideoPlayerView: ExpoVideoView,
  DateTimeField: ExpoDateTimeField,
};

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%' },
  field: { minHeight: 40, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, justifyContent: 'center' },
  sheet: { position: 'absolute', bottom: 0, start: 0, end: 0, borderTopWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
});

let device: ChatDevice = expoChatDevice;

export function getChatDevice(): ChatDevice {
  return device;
}

/** Tests register a fake; `null` restores the device. */
export function registerChatDevice(next: ChatDevice | null): void {
  device = next ?? expoChatDevice;
}

/** A remote picture as base64 (the payload expo-clipboard takes). */
export async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onloadend = () => {
      const s = String(reader.result ?? '');
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}
