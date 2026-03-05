import { supabase } from '@/integrations/supabase/client';

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
export async function getSignedAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 3600); // 1 hour expiry
  
  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Upload file to Supabase storage for chat attachments
 */
export async function uploadChatAttachment(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  threadId?: string
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

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Use signed URL instead of public URL (bucket is now private)
    const signedUrl = await getSignedAttachmentUrl(data.path);
    if (!signedUrl) {
      throw new Error('Failed to generate signed URL for uploaded file');
    }

    // Simulate progress updates for better UX
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    return {
      url: signedUrl,
      path: data.path,
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
