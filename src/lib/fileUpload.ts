import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export interface FileUploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
  name: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AttachmentData {
  type: 'image' | 'file' | 'voice' | 'video' | 'audio';
  url: string;
  path?: string; // Storage path for signed URL generation
  filename?: string;
  name: string;
  size: number;
  mime?: string;
  duration?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Generate a signed URL for a chat attachment (private bucket)
 */
export async function getSignedAttachmentUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(path, expiresInSeconds); // 1 hour unless the caller asks otherwise

    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    // VTID-05138: a network failure must read as "could not sign", never
    // as an unhandled rejection that leaves the bubble waiting forever.
    console.error('Error creating signed URL:', error);
    return null;
  }
}

/**
 * VTID-05138 — copy a chat attachment into the forwarder's own folder for
 * another conversation, so the people in that conversation can read it.
 *
 * Read access to the private bucket is decided by the path
 * (`can_access_chat_attachment`): segment 1 is the uploader, segment 2 the
 * DM recipient's user id or the group id. A forwarded file therefore needs a
 * copy at `{me}/{targetThreadId}/{ts}_{rand}.{ext}` — the same shape
 * `uploadChatAttachment` writes — before it is sent there.
 */
export async function copyChatAttachmentForThread(
  sourcePath: string,
  userId: string,
  targetThreadId: string
): Promise<{ path: string; url: string }> {
  const lastSegment = sourcePath.split('/').pop() || '';
  const ext = lastSegment.includes('.') ? lastSegment.split('.').pop() || '' : '';
  const randomId = Math.random().toString(36).substring(2);
  const destPath = `${userId}/${targetThreadId}/${Date.now()}_${randomId}${ext ? `.${ext}` : ''}`;

  const { error } = await supabase.storage.from('chat-attachments').copy(sourcePath, destPath);
  if (error) throw error;

  const url = await getSignedAttachmentUrl(destPath);
  if (!url) throw new Error('Failed to generate signed URL for copied attachment');
  return { path: destPath, url };
}

/**
 * VTID-05316 — PUT one file to a Supabase signed upload URL with
 * XMLHttpRequest, so the composer gets real progress events. Resolves on 2xx,
 * rejects with an Error (status / network / abort) otherwise.
 */
export function putToSignedUploadUrl(
  signedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('x-upsert', 'false');
    // The same apikey header the storage client sends (the token in the URL authorises the upload).
    if (SUPABASE_PUBLISHABLE_KEY) xhr.setRequestHeader('apikey', SUPABASE_PUBLISHABLE_KEY);
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (!onProgress || !e.lengthComputable) return;
      // Never report 100 % before the server has answered.
      onProgress({ loaded: e.loaded, total: e.total, percentage: Math.min(99, Math.round((e.loaded / e.total) * 100)) });
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed (network)'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    xhr.send(body);
  });
}

/**
 * Upload file to Supabase storage for chat attachments.
 *
 * VTID-05316: real progress — the file goes to a signed upload URL
 * (`createSignedUploadUrl`, same bucket and path rule as before) via
 * XMLHttpRequest. If that request cannot be made (no XHR, a CORS / network
 * refusal of the PUT itself), the client library's `uploadToSignedUrl` is used
 * instead (no progress events, same result).
 */
export async function uploadChatAttachment(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  threadId?: string,
  opts: { signal?: AbortSignal } = {},
): Promise<FileUploadResult> {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to upload files');
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${timestamp}_${randomId}.${fileExtension}`;
    
    // Use provided threadId or generate a temporary one for draft messages
    const actualThreadId = threadId || 'draft';
    
    // Construct path: {user_id}/{thread_id}/{filename}
    const filePath = `${user.id}/${actualThreadId}/${fileName}`;

    const bucket = supabase.storage.from('chat-attachments');
    const { data: signed, error: signError } = await bucket.createSignedUploadUrl(filePath);
    if (signError || !signed?.signedUrl) throw signError ?? new Error('Failed to create an upload URL');

    let storedPath = signed.path || filePath;
    if (typeof XMLHttpRequest !== 'undefined') {
      try {
        await putToSignedUploadUrl(signed.signedUrl, file, onProgress, opts.signal);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err;
        // A refused PUT (status) is final; only a network-level failure of the
        // XHR itself falls back to the library call.
        if (!/network/.test(String((err as Error)?.message))) throw err;
        const { data, error } = await bucket.uploadToSignedUrl(signed.path || filePath, signed.token, file);
        if (error) throw error;
        storedPath = data?.path || storedPath;
      }
    } else {
      const { data, error } = await bucket.uploadToSignedUrl(signed.path || filePath, signed.token, file);
      if (error) throw error;
      storedPath = data?.path || storedPath;
    }

    // Use signed URL instead of public URL (bucket is now private)
    const signedUrl = await getSignedAttachmentUrl(storedPath);
    if (!signedUrl) {
      throw new Error('Failed to generate signed URL for uploaded file');
    }

    onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });

    return {
      url: signedUrl,
      path: storedPath,
      size: file.size,
      type: file.type,
      name: file.name
    };

  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete file from chat attachments storage
 */
export async function deleteChatAttachment(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('chat-attachments')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
}

/**
 * Get file type category for UI display
 */
export function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || 
      mimeType.includes('document') || 
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')) return 'document';
  return 'other';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file type for upload
 */
export function isValidFileType(file: File): boolean {
  // Allow most common file types
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime',
    // Audio
    'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm',
    // Documents
    'application/pdf', 'text/plain', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
  ];

  return allowedTypes.includes(file.type) || file.type.startsWith('text/');
}

/**
 * Validate file for security and size
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 50MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`
    };
  }

  // Check file type
  if (!isValidFileType(file)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not supported`
    };
  }

  return { valid: true };
}

/**
 * Create voice message blob from audio recording
 */
export function createVoiceMessageBlob(audioChunks: BlobPart[], mimeType: string = 'audio/webm'): Blob {
  return new Blob(audioChunks, { type: mimeType });
}

/**
 * Upload voice message
 */
export async function uploadVoiceMessage(
  audioBlob: Blob,
  duration: number,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileUploadResult & { duration: number }> {
  try {
    // Create file from blob
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileName = `voice_${timestamp}_${randomId}.webm`;
    const file = new File([audioBlob], fileName, { type: 'audio/webm' });

    const result = await uploadChatAttachment(file, onProgress);

    return {
      ...result,
      duration
    };

  } catch (error) {
    console.error('Error uploading voice message:', error);
    throw error;
  }
}

/**
 * Get attachment type from file
 */
export function getAttachmentType(file: File): 'image' | 'file' | 'video' | 'audio' {
  const category = getFileTypeCategory(file.type);
  if (category === 'image') return 'image';
  if (category === 'video') return 'video';
  if (category === 'audio') return 'audio';
  return 'file';
}

/**
 * Check if file is an image
 */
export function isImageType(mime: string): boolean {
  return mime.startsWith('image/');
}
