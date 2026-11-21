/**
 * VTID-05677 — the device pickers of the upload and edit sheets, replacing the web
 * hidden `<input type="file">` of `UnifiedUploadModal.tsx` / `EditShortVideoModal.tsx`:
 * a video from the photo library (`expo-image-picker`), an audio file
 * (`expo-document-picker`) and a thumbnail image (`expo-image-picker`). The
 * permission strings are the existing config plugins in `app.config.ts`
 * (`diaryCapturePlugins()`, `contactsImportPlugins()`); nothing is added here.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { PickedFile } from '../../ports/media';

export type PickResult = { status: 'picked'; file: PickedFile; durationSec?: number } | { status: 'cancelled' } | { status: 'denied' };

const nameFromUri = (uri: string, fallback: string) => decodeURIComponent(uri.split('/').pop() || fallback);

async function pickFromLibrary(mediaTypes: ImagePicker.MediaType[], fallbackName: string, fallbackMime: string): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied' };
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, allowsMultipleSelection: false, quality: 0.9 });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const a = result.assets[0];
  return {
    status: 'picked',
    file: { uri: a.uri, name: a.fileName ?? nameFromUri(a.uri, fallbackName), mimeType: a.mimeType ?? fallbackMime, size: a.fileSize ?? 0 },
    // expo-image-picker reports a video's duration in milliseconds.
    durationSec: typeof a.duration === 'number' ? Math.floor(a.duration / 1000) : undefined,
  };
}

export const pickVideoFile = () => pickFromLibrary(['videos'], 'video.mp4', 'video/mp4');
export const pickThumbnailFile = () => pickFromLibrary(['images'], 'thumbnail.jpg', 'image/jpeg');

export async function pickAudioFile(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: false, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const a = result.assets[0];
  return { status: 'picked', file: { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'audio/mpeg', size: a.size ?? 0 } };
}
