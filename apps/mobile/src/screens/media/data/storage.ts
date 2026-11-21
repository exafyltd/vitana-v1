/**
 * VTID-05677 — storage helpers shared by the Media Hub data files: the public
 * URL → object path twin of web `extractStoragePath` (`src/lib/utils.ts:8-13`)
 * and the file-bytes read the web does with `File.arrayBuffer()`.
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/** Web `file.name.replace(/[^a-zA-Z0-9._-]/g, '_')` (`useMediaUpload.ts`, `useVideoUpload.ts`). */
export const safeFileName = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

/** The picked file's bytes (React Native `fetch` reads a `file://` uri). */
export async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return res.arrayBuffer();
}
