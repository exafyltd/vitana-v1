/**
 * VTID-05429 (Native Wave 2, profile lane) — the picker step every profile
 * upload shares: open the library through the media port, then the web's
 * file checks with the web's toasts (HEIC → `heicheifFormatNotSupportedByBrowsers`,
 * another format → upload failed). A refused photo-library permission shows
 * the native permission toast (no web twin: the browser file input has none).
 */
import { notifyError } from '../../ports/ui';
import { checkImage, fileExtOf, pickProfileImages, type ProfileImage } from '../../ports/profile-media';

/**
 * One image that passes `exts`, or null (cancelled / denied / refused, with the
 * matching toast). `formatHint`: the Identity form names the refused extension
 * (web IdentityForm); the Cover Library shows the bare title (web CoverLibraryDrawer).
 */
export async function pickCheckedImage(exts: readonly string[], titleKey: string, formatHint = false): Promise<ProfileImage | null> {
  const picked = await pickProfileImages();
  if (picked.status === 'denied') {
    notifyError(titleKey, 'profileNative.media.photosDenied');
    return null;
  }
  if (picked.status !== 'picked') return null;
  const image = picked.images[0];
  const check = checkImage(image, exts);
  if (check === 'heic') {
    notifyError(titleKey, 'toasts.profile.heicheifFormatNotSupportedByBrowsers');
    return null;
  }
  if (check === 'unsupported') {
    if (formatHint) notifyError(titleKey, 'profileNative.media.unsupportedFormat', { ext: fileExtOf(image) });
    else notifyError(titleKey);
    return null;
  }
  return image;
}
