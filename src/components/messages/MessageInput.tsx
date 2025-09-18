import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { validateFile, uploadChatAttachment, formatFileSize, type AttachmentData, type UploadProgress } from "@/lib/fileUpload";
import { 
  Send, 
  Smile, 
  Paperclip, 
  DollarSign, 
  Calendar,
  Heart,
  Zap,
  Clock,
  MapPin,
  X,
  FileText,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, messageType?: string, contentData?: any, actionButtons?: any[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  threadId?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  placeholder = "Type a message...",
  disabled = false,
  className,
  threadId
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: UploadProgress }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { activeTenantId } = useTenant();

  // Auto-resize textarea with proper row limits (1-6 rows)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to calculate scrollHeight properly
      textarea.style.height = 'auto';
      
      // Calculate line height (approximately 24px for default text)
      const lineHeight = 24;
      const minHeight = lineHeight; // 1 row
      const maxHeight = lineHeight * 6; // 6 rows max
      
      // Set height based on content, clamped to min/max
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
      textarea.style.height = newHeight + 'px';
      
      // Enable scrolling if content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
      
      // Keep last message visible when composer grows
      if (newHeight > minHeight) {
        // Small delay to ensure DOM has updated
        setTimeout(() => {
          const container = document.querySelector('[data-conversation-container]');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 10);
      }
    }
  }, [message]);

  // WhatsApp-style typing indicator logic
  const handleTypingStart = () => {
    if (!isComposing && onTypingStart) {
      setIsComposing(true);
      onTypingStart();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 1.5 seconds of inactivity (WhatsApp style)
    typingTimeoutRef.current = setTimeout(() => {
      if (onTypingStop) {
        onTypingStop();
      }
      setIsComposing(false);
    }, 1500);
  };

  const handleTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (isComposing && onTypingStop) {
      onTypingStop();
    }
    setIsComposing(false);
  };

  const handleBlur = () => {
    // Stop typing immediately on blur (WhatsApp style)
    handleTypingStop();
  };

  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || disabled || isUploading) return;
    
    handleTypingStop();

    try {
      let messageContent = message.trim();
      let messageType = 'text';
      let contentData: any = null;

      if (attachments.length > 0) {
        // Send message with attachment data
        messageType = 'attachment';
        contentData = {
          attachments: attachments
        };
        
        // Include text with attachments if provided
        if (message.trim()) {
          messageContent = message.trim();
        } else {
          messageContent = attachments.length === 1 
            ? `Shared ${attachments[0].filename}` 
            : `Shared ${attachments.length} files`;
        }
      }

      onSendMessage(messageContent, messageType, contentData);
      setMessage("");
      setAttachments([]);
      setUploadProgress({});
      
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Shift+Enter = new line, Enter = send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Allow Shift+Enter to create new lines naturally
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (e.target.value.trim()) {
      // Debounce typing start by 250ms (WhatsApp style)
      debounceTimeoutRef.current = setTimeout(() => {
        handleTypingStart();
      }, 250);
    } else {
      handleTypingStop();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Only allow one file at a time for better UX
    const file = files[0];
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "File not allowed",
        description: validation.error,
        variant: "destructive"
      });
      
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Start upload process
    setIsUploading(true);
    const uploadId = Date.now().toString();
    
    try {
      const currentThreadId = threadId || 'current-thread';
      
      const attachmentData = await uploadChatAttachment(
        file,
        activeTenantId || 'default',
        currentThreadId,
        (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [uploadId]: progress
          }));
        }
      );

      // Add successful upload to attachments
      setAttachments(prev => [...prev, attachmentData]);
      
      // Clean up progress tracking
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });
      
      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
      
      // Clean up progress tracking
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });
    } finally {
      setIsUploading(false);
      
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendPaymentRequest = (amount: string, description: string) => {
    const paymentData = {
      amount: parseFloat(amount),
      description,
      currency: 'USD'
    };

    const actionButtons = [
      { label: 'Pay Now', variant: 'default', action: 'payment_accept', data: paymentData },
      { label: 'Decline', variant: 'outline', action: 'payment_decline' }
    ];

    onSendMessage(
      `Payment request: $${amount} - ${description}`,
      'payment_request',
      paymentData,
      actionButtons
    );
  };

  const sendCalendarInvite = (title: string, date: string) => {
    const eventData = {
      title,
      date,
      type: 'meeting'
    };

    const actionButtons = [
      { label: 'Accept', variant: 'default', action: 'calendar_accept', data: eventData },
      { label: 'Decline', variant: 'outline', action: 'calendar_decline' },
      { label: 'Maybe', variant: 'secondary', action: 'calendar_maybe' }
    ];

    onSendMessage(
      `Calendar invite: ${title} on ${date}`,
      'calendar_invite',
      eventData,
      actionButtons
    );
  };

  const quickReactions = ['❤️', '👍', '😊', '🎉', '💪', '🙏'];

  return (
    <div className={cn("flex flex-col gap-2 p-4 bg-background border-t", className)}>
      {/* File Attachments Preview */}
      {(attachments.length > 0 || Object.keys(uploadProgress).length > 0) && (
        <div className="px-4 pb-2" id="attachment-status">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm"
              >
                {attachment.type === 'image' ? (
                  <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={attachment.url} 
                      alt={attachment.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate max-w-32 font-medium">
                    {attachment.filename}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatFileSize(attachment.size)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => removeAttachment(index)}
                  aria-label={`Remove ${attachment.filename}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}

            {/* Show upload progress */}
            {Object.entries(uploadProgress).map(([id, progress]) => (
              <div
                key={id}
                className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 text-sm"
              >
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">
                  {progress.stage === 'validating' && 'Validating...'}
                  {progress.stage === 'uploading' && `Uploading... ${progress.progress}%`}
                  {progress.stage === 'complete' && 'Complete!'}
                  {progress.stage === 'error' && 'Error'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Quick Actions */}
        <div className="flex gap-1">
          {/* Payment Request */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                <DollarSign className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium">Send Payment Request</h4>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Amount (USD)"
                    id="payment-amount"
                  />
                  <Textarea
                    placeholder="What's this for?"
                    id="payment-description"
                  />
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      const amount = (document.getElementById('payment-amount') as HTMLInputElement)?.value;
                      const description = (document.getElementById('payment-description') as HTMLInputElement)?.value;
                      if (amount && description) {
                        sendPaymentRequest(amount, description);
                      }
                    }}
                  >
                    Send Request
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Calendar Invite */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                <Calendar className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium">Send Calendar Invite</h4>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Event title"
                    id="event-title"
                  />
                  <Textarea
                    placeholder="Date & Time"
                    id="event-date"
                  />
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      const title = (document.getElementById('event-title') as HTMLInputElement)?.value;
                      const date = (document.getElementById('event-date') as HTMLInputElement)?.value;
                      if (title && date) {
                        sendCalendarInvite(title, new Date(date).toLocaleDateString());
                      }
                    }}
                  >
                    Send Invite
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick Reactions */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Quick Reactions</h4>
                <div className="grid grid-cols-6 gap-1">
                  {quickReactions.map((emoji, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-lg"
                      onClick={() => onSendMessage(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Message Input Area */}
        <div className="flex items-end gap-2 flex-1 relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.docx,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 mb-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[24px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-3"
              rows={1}
              aria-label="Message composer"
              aria-describedby={attachments.length > 0 ? "attachment-status" : undefined}
            />
            {/* Error messages area */}
            <div id="message-error" aria-live="polite" className="sr-only" />
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSend}
              disabled={!message.trim() && attachments.length === 0 || disabled || isUploading}
              className="absolute right-1 bottom-1 h-8 w-8 p-0"
              aria-label="Send message"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
