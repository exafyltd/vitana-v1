/**
 * HEIC/HEIF → JPEG conversion for uploads.
 *
 * Phones (notably iPhones and Android devices set to "high efficiency") often
 * hand over HEIC/HEIF photos. Browsers cannot decode them, so the post
 * preview is blank and the storage bucket rejects the MIME type. We convert
 * them to JPEG on the client before anything is uploaded.
 *
 * `heic2any` is loaded with a dynamic import so its ~2.7 MB decoder is only
 * fetched when a user actually picks a HEIC file.
 */

const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
const HEIC_EXTENSIONS = ['heic', 'heif'];

/** True when the file is HEIC/HEIF, judged by MIME type or — because some
 * Android pickers report an empty type — by file extension. */
export function isHeicFile(file: Pick<File, 'name' | 'type'>): boolean {
  if (HEIC_MIME_TYPES.includes(file.type.toLowerCase())) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return HEIC_EXTENSIONS.includes(ext);
}

/**
 * Convert a HEIC/HEIF file to a JPEG `File`. Multi-image HEIC containers
 * (bursts, live photos) yield several blobs; the first (primary) frame is used.
 * Rejects when the file cannot be decoded.
 */
export type HeicDecoder = (options: {
  blob: Blob;
  toType: string;
  quality: number;
}) => Promise<Blob | Blob[]>;

const loadDefaultDecoder: HeicDecoder = async (options) => {
  const { default: heic2any } = await import('heic2any');
  return heic2any(options);
};

export async function convertHeicToJpeg(file: File, decode: HeicDecoder = loadDefaultDecoder): Promise<File> {
  const result = await decode({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!blob || blob.size === 0) {
    throw new Error('HEIC conversion produced an empty image');
  }
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
}
