import React from 'react';
import { X, File, Image, Video, Music, Download } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileTypeCategory } from '@/lib/fileUpload';
import { t } from '@/lib/i18n-toast';

interface AttachmentPreviewProps {
  file: File;
  uploadProgress?: number;
  onRemove?: () => void;
  className?: string;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  file,
  uploadProgress,
  onRemove,
  className
}) => {
  const fileType = getFileTypeCategory(file.type);
  const isUploading = uploadProgress !== undefined && uploadProgress < 100;

  const getFileIcon = () => {
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getPreviewContent = () => {
    if (fileType === 'image' && file.size < 10 * 1024 * 1024) { // Only preview images under 10MB
      const url = URL.createObjectURL(file);
      return (
        <div className="relative h-16 w-16 rounded overflow-hidden bg-muted">
          <img 
            src={url} 
            alt={file.name}
            className="h-full w-full object-cover"
            onLoad={() => URL.revokeObjectURL(url)}
          />
        </div>
      );
    }

    return (
      <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
        {getFileIcon()}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border bg-background",
      isUploading && "opacity-60",
      className
    )}>
      {getPreviewContent()}
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
          {isUploading && ` • ${uploadProgress}%`}
        </div>
        
        {isUploading && (
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
      
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isUploading}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

interface MessageAttachmentProps {
  url: string;
  name: string;
  size: number;
  type: string;
  className?: string;
}

export const MessageAttachment: React.FC<MessageAttachmentProps> = ({
  url,
  name,
  size,
  type,
  className
}) => {
  const fileType = getFileTypeCategory(type);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (fileType === 'image') {
    return (
      <div className={cn("max-w-sm", className)}>
        <img 
          src={url} 
          alt={name}
          className="rounded-lg max-h-64 w-auto cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(url, '_blank')}
        />
        <div className="text-xs text-muted-foreground mt-1">
          {formatFileSize(size)}
        </div>
      </div>
    );
  }

  if (fileType === 'video') {
    return (
      <div className={cn("max-w-sm", className)}>
        <video 
          src={url}
          controls
          className="rounded-lg max-h-64 w-full"
          preload="metadata"
        >
          {t('screens.ui.yourBrowserDoesNotSupportVideo')}
        </video>
        <div className="text-xs text-muted-foreground mt-1">
          {formatFileSize(size)}
        </div>
      </div>
    );
  }

  if (fileType === 'audio') {
    return (
      <div className={cn("flex items-center gap-3 p-3 border rounded-lg bg-muted/30 max-w-sm", className)}>
        <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          <audio src={url} controls className="mt-2 w-full h-8" />
          <div className="text-xs text-muted-foreground mt-1">
            {formatFileSize(size)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 border rounded-lg bg-muted/30 max-w-sm cursor-pointer hover:bg-muted/50 transition-colors",
      className
    )} onClick={handleDownload}>
      <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
        <File className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(size)}
        </div>
      </div>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};