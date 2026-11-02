/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the device capture the
 * Daily Diary needs, behind one port (plan decision 3): photos through
 * `expo-image-picker` (library or camera; replaces the web
 * `<input type="file" accept="image/*">`) and voice through the `expo-audio`
 * recorder (replaces the web MediaRecorder / Web Speech capture in
 * `src/utils/diaryAudioRecorder.ts` and `ClientSTT`). The recording is
 * transcribed by the same backend STT the web falls back to (the
 * `transcribe-audio` edge function), see screens/diary/data/storage.ts.
 *
 * Usage descriptions (camera, photo library, microphone) are registered as
 * config plugins in app.config.ts. Device-only: the jest suite mocks both
 * packages; the live exercise is the G1 task (tasks.md diary task 7).
 */
import { useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

export type PickedImage = { uri: string; base64: string; mimeType: string; fileName: string };
export type PickSource = 'library' | 'camera';
export type PickResult = { status: 'picked'; images: PickedImage[] } | { status: 'cancelled' } | { status: 'denied' };

function extOf(mime: string, fileName?: string | null): string {
  const fromName = fileName?.split('.').pop();
  if (fromName && fromName !== fileName) return fromName.toLowerCase();
  const sub = mime.split('/')[1] ?? 'jpg';
  return sub === 'jpeg' ? 'jpg' : sub;
}

/** Asks for the permission, opens the library (several images) or the camera (one), returns the images with their base64. */
export async function pickDiaryImages(source: PickSource): Promise<PickResult> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied' };
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.8, allowsMultipleSelection: source === 'library' };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const images = result.assets
    .filter((a) => typeof a.base64 === 'string' && a.base64.length > 0)
    .map((a, i) => {
      const mimeType = a.mimeType ?? 'image/jpeg';
      return { uri: a.uri, base64: a.base64 as string, mimeType, fileName: a.fileName ?? `photo-${i + 1}.${extOf(mimeType)}` };
    });
  return images.length ? { status: 'picked', images } : { status: 'cancelled' };
}

/** The file extension for an upload path (web `file.name.split('.').pop()`). */
export function imageExtension(image: Pick<PickedImage, 'mimeType' | 'fileName'>): string {
  return extOf(image.mimeType, image.fileName);
}

export type DiaryRecorder = {
  /** Asks for the microphone, then records. `denied` when the member said no. */
  start: () => Promise<'recording' | 'denied'>;
  /** Stops and returns the recording's file uri (null when nothing was recorded). */
  stop: () => Promise<{ uri: string; mimeType: string } | null>;
  /** Stops without keeping the recording (screen left mid-recording). */
  cancel: () => void;
};

/** The `expo-audio` recorder (AAC in an .m4a, `audio/mp4` like the web default). */
export function useDiaryRecorder(): DiaryRecorder {
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

/** Reads a local recording as base64 (the payload the backend STT takes). */
export async function readFileBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
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
