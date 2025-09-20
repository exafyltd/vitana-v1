import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Paperclip, 
  Image, 
  FileText, 
  Camera, 
  User, 
  BarChart3,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentMenuProps {
  onFileAttach: () => void;
  onImageAttach?: () => void;
  onDocumentAttach?: () => void;
  onCameraAttach?: () => void;
  onContactAttach?: () => void;
  onPollAttach?: () => void;
  onDrawingAttach?: () => void;
  disabled?: boolean;
  className?: string;
}

const attachmentOptions = [
  {
    id: 'photos',
    label: 'Photos & videos',
    icon: Image,
    color: 'text-blue-500',
    action: 'onImageAttach'
  },
  {
    id: 'camera',
    label: 'Camera',
    icon: Camera,
    color: 'text-pink-500',
    action: 'onCameraAttach'
  },
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    color: 'text-purple-500',
    action: 'onDocumentAttach'
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: User,
    color: 'text-orange-500',
    action: 'onContactAttach'
  },
  {
    id: 'poll',
    label: 'Poll',
    icon: BarChart3,
    color: 'text-green-500',
    action: 'onPollAttach'
  },
  {
    id: 'drawing',
    label: 'Drawing',
    icon: Palette,
    color: 'text-red-500',
    action: 'onDrawingAttach'
  }
];

export function AttachmentMenu({
  onFileAttach,
  onImageAttach,
  onDocumentAttach,
  onCameraAttach,
  onContactAttach,
  onPollAttach,
  onDrawingAttach,
  disabled = false,
  className
}: AttachmentMenuProps) {
  const handleOptionClick = (option: typeof attachmentOptions[0]) => {
    switch (option.action) {
      case 'onImageAttach':
        if (onImageAttach) {
          onImageAttach();
        } else {
          onFileAttach();
        }
        break;
      case 'onDocumentAttach':
        if (onDocumentAttach) {
          onDocumentAttach();
        } else {
          onFileAttach();
        }
        break;
      case 'onCameraAttach':
        if (onCameraAttach) {
          onCameraAttach();
        } else {
          onFileAttach();
        }
        break;
      case 'onContactAttach':
        if (onContactAttach) {
          onContactAttach();
        } else {
          onFileAttach();
        }
        break;
      case 'onPollAttach':
        if (onPollAttach) {
          onPollAttach();
        } else {
          onFileAttach();
        }
        break;
      case 'onDrawingAttach':
        if (onDrawingAttach) {
          onDrawingAttach();
        } else {
          onFileAttach();
        }
        break;
      default:
        onFileAttach();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          className={cn(
            "w-8 h-8 p-0 rounded-full hover:bg-muted",
            className
          )}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start"
        className="w-56 p-2 bg-background/95 backdrop-blur-sm border border-border shadow-lg"
      >
        <div className="grid gap-1">
          {attachmentOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.id}
                variant="ghost"
                className="w-full justify-start h-10 px-3"
                onClick={() => handleOptionClick(option)}
              >
                <Icon className={cn("w-5 h-5 mr-3", option.color)} />
                <span className="text-sm">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}