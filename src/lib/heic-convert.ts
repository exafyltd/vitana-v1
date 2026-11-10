/**
 * HEIC/HEIF detection for uploads.
 *
 * Phones (notably iPhones and Android devices set to "high efficiency") often
 * hand over HEIC/HEIF photos. Browsers cannot decode them, so the post preview
 * is blank and the storage bucket rejects the MIME type. Callers refuse these
 * files with a message asking for JPEG instead.
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
