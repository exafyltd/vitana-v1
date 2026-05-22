import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { VoiceRecorder } from '@/components/ui/voice-recorder';
import { AttachmentPreview } from '@/components/ui/attachment-preview';
import { cn } from '@/lib/utils';
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/context/AuthProvider";
import { 
  validateFile, 
  uploadChatAttachment, 
  uploadVoiceMessage,
  formatFileSize, 
  isValidFileType,
  type AttachmentData, 
  type UploadProgress 
} from "@/lib/fileUpload";
import { 
  Send, 
  Smile, 
  X,
  Loader2,
  Mic,
  Paperclip
} from 'lucide-react';
import { AttachmentMenu } from '@/components/messages/AttachmentMenu';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { ReplyPreview } from '@/components/messages/ReplyPreview';
import { notifyError, t } from '@/lib/i18n-toast';

interface MessageInputProps {
  onSendMessage: (content: string, messageType?: string, contentData?: any, actionButtons?: any[], parentMessageId?: string) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  threadId?: string;
  recipientId?: string | null;
  effectiveRecipientId?: string | null;
  effectiveRecipient?: { id: string; name?: string; avatar?: string } | null;
  activeThread?: { id: string; type?: string } | null;
  replyingTo?: any;
  onCancelReply?: () => void;
  isSending?: boolean;
  conversationType?: 'direct' | 'group' | null;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  placeholder = "Type a message...",
  disabled = false,
  className,
  threadId,
  recipientId,
  effectiveRecipientId,
  effectiveRecipient,
  activeThread,
  replyingTo,
  onCancelReply,
  isSending = false,
  conversationType
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: UploadProgress }>({});
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeTenantId } = useTenant();

  // Auto-resize textarea with proper row limits (1-6 rows) and update CSS var
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
      
      // Update the CSS variable on :root so any element can read it
      const totalComposerHeight = newHeight + 32; // padding and borders
      document.documentElement.style.setProperty('--composer-h', `${Math.max(56, totalComposerHeight)}px`);
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Guard conditions - allow sending if we have either threadId or recipientId
    if ((!activeThread?.id && !recipientId) || (message.trim() === '' && attachments.length === 0) || disabled || isUploading || isSending) {
      return;
    }
    
    const raw = message;
    const text = raw.trim();
    
    // Clear composer optimistically
    setMessage("");
    setAttachments([]);
    setUploadProgress({});
    handleTypingStop();

    try {
      let messageContent = text;
      let messageType = 'text';
      let contentData: any = null;

      if (attachments.length > 0) {
        // Send message with attachment data
        messageType = 'attachment';
        contentData = {
          attachments: attachments
        };

        // If the user didn't type anything, leave the body empty — the
        // attachment IS the message. The gateway accepts empty content when
        // message_type='attachment' and at least one attachment is provided,
        // and MessageBubble renders the media without a redundant "Shared X"
        // caption.
        messageContent = text;
      }

      await onSendMessage(messageContent, messageType, contentData, undefined, replyingTo?.id);
      
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Restore composer text on error
      setMessage(raw);
      setAttachments(attachments);
      
      const errorMessage = error instanceof Error ? error.message : "unknown";
      
      notifyError('toasts.messages.messageFailed');
      
      console.error({
        stage: "send", 
        threadId: activeThread?.id, 
        payload: { text }, 
        error
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

    // Validate all files first
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        notifyError('toasts.messages.fileNotAllowed');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    // Ensure we have a thread to attach to
    if (!threadId) {
      notifyError('toasts.messages.openConversation', 'toasts.messages.selectOpenConversationBeforeAttachingFiles');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);

    for (const file of files) {
      const uploadId = Date.now().toString() + '_' + file.name;
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { loaded: 0, total: file.size, percentage: 0 }
      }));
      console.log('[Attachment] Upload starting', { threadId, name: file.name, type: file.type, size: file.size });

      try {
        const attachmentResult = await uploadChatAttachment(
          file,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [uploadId]: progress
            }));
          },
          threadId
        );

        console.log('[Attachment] Upload success', { url: attachmentResult.url, path: attachmentResult.path, type: attachmentResult.type, size: attachmentResult.size });
        // Detect images for inline preview. Mime check covers desktops and
        // most Android pickers; the extension fallback handles cases where
        // the OS file picker delivers an empty mime (Samsung's SAF on
        // screenshots, some iOS variants) so a `.png` screenshot still
        // renders as an image instead of a "download" file chip.
        const previewableImageMimes = new Set([
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
          'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
          'image/bmp', 'image/tiff', 'image/avif',
        ]);
        const previewableExts = /\.(jpe?g|png|gif|webp|svg|heic|heif|bmp|tiff?|avif)$/i;
        const mime = (attachmentResult.type || '').toLowerCase();
        const isPreviewImage =
          previewableImageMimes.has(mime)
          || mime.startsWith('image/')
          || previewableExts.test(attachmentResult.name || '');
        const attachmentData: AttachmentData = {
          type: isPreviewImage ? 'image' : 'file',
          url: attachmentResult.url,
          path: attachmentResult.path,
          name: attachmentResult.name,
          size: attachmentResult.size,
          mime: attachmentResult.type,
          filename: attachmentResult.name
        };

        setAttachments(prev => [...prev, attachmentData]);

        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      } catch (error) {
        console.error('Upload error:', error);
        notifyError('toasts.messages.uploadFailed');
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const file = attachments[index];
    if (file) {
      const fileId = `${file.name}-${file.size}`;
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecording = async (audioBlob: Blob, duration: number) => {
    try {
      setIsUploading(true);
      
      const result = await uploadVoiceMessage(audioBlob, duration, (progress) => {
        // Voice message upload progress could be shown here
      });

      // Send voice message (wrap in attachments array for consistent storage)
      const safeDuration = isFinite(duration) ? Math.round(duration) : 0;
      await onSendMessage(
        `🎤 Voice message (${safeDuration}s)`,
        'voice',
        {
          attachments: [{
            type: 'voice',
            url: result.url,
            duration: result.duration,
            size: result.size,
            name: result.name
          }]
        }
      );

      setShowVoiceRecorder(false);

    } catch (error) {
      console.error('Voice message error:', error);
      notifyError('toasts.messages.failedSendVoiceMessage', 'toasts.messages.thereErrorSendingYourVoiceMessage');
    } finally {
      setIsUploading(false);
    }
  };

  const sendPaymentRequest = async (amount: string, description: string) => {
    const paymentData = {
      amount: parseFloat(amount),
      description,
      currency: 'USD'
    };

    const actionButtons = [
      { label: 'Pay Now', variant: 'default', action: 'payment_accept', data: paymentData },
      { label: 'Decline', variant: 'outline', action: 'payment_decline' }
    ];

    await onSendMessage(
      `Payment request: $${amount} - ${description}`,
      'payment_request',
      paymentData,
      actionButtons
    );
  };

  const sendCalendarInvite = async (title: string, date: string, time?: string, endTime?: string, location?: string, description?: string) => {
    // Compose ISO timestamps using safe numeric constructor
    const composeIso = (dateStr: string, timeStr?: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (timeStr) {
        const [h, mi] = timeStr.split(':').map(Number);
        return new Date(y, m-1, d, h, mi, 0, 0).toISOString();
      }
      return new Date(y, m-1, d, 9, 0, 0, 0).toISOString();
    };

    const start_time = composeIso(date, time);
    const end_time = endTime ? composeIso(date, endTime) : 
      new Date(new Date(start_time).getTime() + 60 * 60 * 1000).toISOString();

    const eventData = {
      title,
      date,
      time,
      endTime,
      location,
      description,
      type: 'meeting',
      start_time, // Add explicit ISO times
      end_time
    };

    const actionButtons = [
      { label: 'Accept', variant: 'default', action: 'calendar_accept', data: eventData },
      { label: 'Decline', variant: 'outline', action: 'calendar_decline', data: eventData },
      { label: 'Maybe', variant: 'secondary', action: 'calendar_maybe', data: eventData }
    ];

    const timeStr = time ? ` at ${time}` : '';
    const locationStr = location ? ` at ${location}` : '';
    
    await onSendMessage(
      `Calendar invite: ${title}${timeStr} on ${date}${locationStr}`,
      'calendar_invite',
      eventData,
      actionButtons
    );
  };

  const quickReactions = ['❤️', '👍', '😊', '🎉', '💪', '🙏'];
  const canSend = (message.trim().length > 0 || attachments.length > 0) && !isUploading && !disabled && !isSending;

  return (
    <form 
      id="composer"
      onSubmit={handleSend} 
      className={cn("flex flex-col gap-1 px-1 py-0.5 m-0", className)}
    >
      {/* Reply Preview */}
      {replyingTo && onCancelReply && (
        <ReplyPreview 
          message={replyingTo} 
          onCancel={onCancelReply}
          currentUserId={user?.id}
        />
      )}

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
                <span className="text-muted-foreground">{t('screens.messages.uploadingPercentage', { percentage: progress.percentage })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        {showVoiceRecorder ? (
          /* Voice recorder replaces the input bar */
          <div className="flex items-center flex-1 bg-muted/50 rounded-full px-2 py-1 border border-border/50">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecording}
              onCancel={() => setShowVoiceRecorder(false)}
              disabled={isUploading}
            />
          </div>
        ) : (
        <>
        {/* Pill-shaped input container (WhatsApp style) */}
        <div className="flex items-end gap-1 flex-1 bg-muted/50 rounded-full px-2 py-1 border border-border/50">
          {/* Emoji button */}
          <EmojiPicker
            onEmojiSelect={(emoji) => {
              setMessage(prev => prev + emoji);
              textareaRef.current?.focus();
            }}
            className="h-8 w-8 shrink-0"
          />

          {/* Attachment trigger. For group chats (chat_groups, VTID-03089)
              skip the DM-only Send Funds / Request Payment / Calendar drawer
              and open the native file picker directly — same behavior as
              the rest of the mobile app's chat composers. */}
          {conversationType === 'group' ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 p-0 rounded-full hover:bg-muted shrink-0"
              aria-label={t('screens.messages.attach')}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          ) : (
            <AttachmentMenu
              onFileAttach={() => fileInputRef.current?.click()}
              onSendMessage={async (content, messageType, contentData) => {
                await onSendMessage(content, messageType, contentData);
              }}
              onCalendarInvite={sendCalendarInvite}
              recipient={effectiveRecipient}
              recipientIdHint={effectiveRecipientId || recipientId}
              threadId={threadId}
              disabled={disabled || isUploading}
              conversationType={conversationType}
            />
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.heic,.heif"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1 min-w-0">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[24px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-2 text-base"
              rows={1}
              aria-label={t('screens.messages.messageComposer')}
              aria-describedby={attachments.length > 0 ? "attachment-status" : undefined}
            />
          </div>
        </div>

        {/* Send/Mic button outside the pill */}
        {canSend ? (
          <Button type="submit" size="sm" className="h-9 w-9 p-0 rounded-full shrink-0 bg-domain-messages-accent text-white hover:bg-domain-messages-accent/90" aria-label={t('screens.messages.sendMessage')}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowVoiceRecorder(true)}
            disabled={isUploading || showVoiceRecorder}
            className="h-9 w-9 p-0 rounded-full shrink-0"
            aria-label={t('screens.messages.recordVoiceMessage')}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
        </>
        )}
      </div>
    </form>
  );
};

export default MessageInput;
