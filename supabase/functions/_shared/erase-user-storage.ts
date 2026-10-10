/**
 * VTID-05053 (Health Hub D5): account deletion removes every file the member
 * stored, at every folder depth.
 *
 * The previous loop listed `<userId>/` once and removed only that level. A
 * Storage listing is not recursive, so files in sub-folders (most of
 * media-uploads, all of chat-attachments and health-reports) stayed behind
 * after the account was gone.
 *
 * The walk lists one prefix at a time with `{ limit }` only, never `offset`:
 * it removes the files it saw and lists the same prefix again until a listing
 * returns no files. That keeps the gateway storage-bridge contract
 * (`{ bucket, prefix, limit }`) unchanged, and removing while paging by offset
 * would skip objects anyway. A pass that removes nothing ends the loop.
 *
 * After the walk, `countUserFiles` lists the member's folder again. Anything
 * left is reported as residual, and the caller keeps the account (same rule as
 * erase_user_data, VTID-04765): deleting the account while files remain would
 * leave personal data behind with no account left to erase it from.
 */

export interface StorageEntry {
  name: string;
  /** Present for files on the direct Supabase path; absent for folders and on the bridge path. */
  id?: string | null;
}

export interface StorageAdapter {
  /** Direct path: an entry without `id` is a folder. Bridge path strips `id`. */
  readonly hasIds: boolean;
  list(bucket: string, prefix: string, limit: number): Promise<StorageEntry[]>;
  remove(bucket: string, paths: string[]): Promise<void>;
}

export interface BucketResult {
  bucket: string;
  deleted: number;
  residual: number;
  error?: string;
}

// Buckets where member files live under `<userId>/`. `covers` is not here on
// purpose: published events can still reference a cover after the uploader
// leaves, which needs an event-ownership decision first (STATUS.md).
export const USER_STORAGE_BUCKETS = [
  "avatars",
  "diary-photos",
  "chat-attachments",
  "media-uploads",
  "voucher-pdfs",
  "stream-recordings",
  "event-images",
  "health-reports",
  "feedback-attachments",
];

export const LIST_LIMIT = 1000;
const MAX_PASSES_PER_PREFIX = 10_000;

async function splitEntries(
  storage: StorageAdapter,
  bucket: string,
  prefix: string,
  entries: StorageEntry[],
): Promise<{ files: string[]; folders: string[] }> {
  const files: string[] = [];
  const folders: string[] = [];
  for (const e of entries) {
    const path = `${prefix}/${e.name}`;
    if (storage.hasIds) {
      (e.id ? files : folders).push(path);
    } else {
      // Bridge entries carry no id: a path that has children is a folder.
      const children = await storage.list(bucket, path, 1);
      (children.length > 0 ? folders : files).push(path);
    }
  }
  return { files, folders };
}

/** Removes every file under `prefix`, at every depth. Returns the number removed. */
export async function deletePrefix(storage: StorageAdapter, bucket: string, prefix: string): Promise<number> {
  let deleted = 0;
  const seenFolders = new Set<string>();
  let previousFiles = "";
  for (let pass = 0; pass < MAX_PASSES_PER_PREFIX; pass++) {
    const entries = await storage.list(bucket, prefix, LIST_LIMIT);
    if (entries.length === 0) break;
    const { files, folders } = await splitEntries(storage, bucket, prefix, entries);
    let progressed = false;
    for (const folder of folders) {
      if (seenFolders.has(folder)) continue;
      seenFolders.add(folder);
      const n = await deletePrefix(storage, bucket, folder);
      deleted += n;
      progressed = true;
    }
    const fileKey = files.join("\n");
    if (files.length > 0 && fileKey === previousFiles) {
      // The last remove() reported success but the same files are still
      // listed: stop, and let the residual check report them.
      break;
    }
    previousFiles = fileKey;
    if (files.length > 0) {
      await storage.remove(bucket, files);
      deleted += files.length;
      progressed = true;
    }
    // Only folders already walked are left (Storage may still list an empty
    // folder), or nothing could be removed: stop instead of looping.
    if (!progressed) break;
  }
  return deleted;
}

/** Counts the files still under `prefix`, at every depth. */
export async function countFiles(storage: StorageAdapter, bucket: string, prefix: string): Promise<number> {
  const entries = await storage.list(bucket, prefix, LIST_LIMIT);
  if (entries.length === 0) return 0;
  const { files, folders } = await splitEntries(storage, bucket, prefix, entries);
  let n = files.length;
  for (const folder of folders) n += await countFiles(storage, bucket, folder);
  return n;
}

/** Deletes the member's files in every bucket, then verifies nothing is left. */
export async function eraseUserStorage(
  storage: StorageAdapter,
  userId: string,
  buckets: string[] = USER_STORAGE_BUCKETS,
): Promise<BucketResult[]> {
  const results: BucketResult[] = [];
  for (const bucket of buckets) {
    let deleted = 0;
    let error: string | undefined;
    try {
      deleted = await deletePrefix(storage, bucket, userId);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    let residual: number;
    try {
      residual = await countFiles(storage, bucket, userId);
    } catch (e) {
      // Not verifiable counts as not erased.
      residual = -1;
      error = error ?? (e instanceof Error ? e.message : String(e));
    }
    results.push({ bucket, deleted, residual, ...(error ? { error } : {}) });
  }
  return results;
}

/** True when every bucket was verified empty for the member. */
export function storageFullyErased(results: BucketResult[]): boolean {
  return results.every((r) => r.residual === 0);
}
