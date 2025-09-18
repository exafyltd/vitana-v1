import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadProgress {
  progress: number;
  stage: 'validating' | 'uploading' | 'complete' | 'error';
}

export interface AttachmentData {
  type: 'image' | 'file';
  url: string;
  filename: string;
  size: number;
  mime: string;
}

// Allowed file types with their MIME types
const ALLOWED_TYPES = {
  // Images
  'png': ['image/png'],
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'webp': ['image/webp'],
  // Documents
  'pdf': ['application/pdf'],
  'txt': ['text/plain'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

// Blocked executable extensions
const BLOCKED_EXTENSIONS = [
  'exe', 'dmg', 'bat', 'apk', 'sh', 'js', 'msi', 'deb', 'rpm',
  'app', 'com', 'cmd', 'scr', 'vbs', 'jar', 'py', 'php', 'pl'
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 20MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`
    };
  }

  // Get file extension
  const extension = file.name.toLowerCase().split('.').pop();
  if (!extension) {
    return {
      valid: false,
      error: 'File must have a valid extension'
    };
  }

  // Check if extension is blocked
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `File type '${extension}' is not allowed for security reasons`
    };
  }

  // Check if extension is in allowed list
  const allowedMimeTypes = ALLOWED_TYPES[extension as keyof typeof ALLOWED_TYPES];
  if (!allowedMimeTypes) {
    return {
      valid: false,
      error: `File type '${extension}' is not supported. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`
    };
  }

  // Validate MIME type matches extension
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File MIME type doesn't match extension. Expected: ${allowedMimeTypes.join(' or ')}, got: ${file.type}`
    };
  }

  return { valid: true };
}

export function getAttachmentType(file: File): 'image' | 'file' {
  const extension = file.name.toLowerCase().split('.').pop();
  const imageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
  return imageExtensions.includes(extension || '') ? 'image' : 'file';
}

export async function uploadChatAttachment(
  file: File,
  tenantId: string,
  threadId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<AttachmentData> {
  // Validate file first
  onProgress?.({ progress: 0, stage: 'validating' });
  
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // Generate unique filename: {userId}/{threadId}/{uuid}-{originalName}
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileId = uuidv4();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${threadId}/${fileId}-${sanitizedFilename}`;

    onProgress?.({ progress: 10, stage: 'uploading' });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    onProgress?.({ progress: 80, stage: 'uploading' });

    // Generate signed URL (60 minutes expiry)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(data.path, 60 * 60); // 60 minutes

    if (urlError) {
      throw new Error(`Failed to generate download URL: ${urlError.message}`);
    }

    onProgress?.({ progress: 100, stage: 'complete' });

    return {
      type: getAttachmentType(file),
      url: urlData.signedUrl,
      filename: file.name,
      size: file.size,
      mime: file.type
    };

  } catch (error) {
    onProgress?.({ progress: 0, stage: 'error' });
    throw error;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isImageType(mime: string): boolean {
  return mime.startsWith('image/');
}