import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send, Paperclip, Smile, Image, FileText, X, Plus } from "lucide-react";
import { t } from '@/lib/i18n-toast';
// Remove react-i18next import - not available

interface MessageComposerProps {
  onSend?: (message: { content: string; attachments: File[]; recipients: string[] }) => void;
  recipients?: Array<{ id: string; name: string; avatar: string }>;
  placeholder?: string;
  className?: string;
}

export default function MessageComposer({ 
  onSend, 
  recipients = [], 
  placeholder = "Type your message...",
  className = ""
}: MessageComposerProps) {
  // Remove useTranslation - not available
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend?.({
        content: message.trim(),
        attachments,
        recipients: selectedRecipients
      });
      setMessage("");
      setAttachments([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachment = (type: 'file' | 'image') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : '*/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      setAttachments(prev => [...prev, ...files]);
    };
    input.click();
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addRecipient = () => {
    // Mock functionality - in real app would open contact picker
    console.log("Open contact picker");
  };

  const removeRecipient = (recipientId: string) => {
    setSelectedRecipients(prev => prev.filter(id => id !== recipientId));
  };

  return (
    <Card className={`bg-card/80 backdrop-blur-sm border-border/20 ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* Recipients */}
        {recipients.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('screens.messages.text')}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={addRecipient}
                className="h-6 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {recipients.filter(r => selectedRecipients.includes(r.id)).map(recipient => (
                <Badge 
                  key={recipient.id} 
                  variant="secondary" 
                  className="flex items-center gap-2 pr-1"
                >
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={recipient.avatar} />
                    <AvatarFallback className="text-xs">
                      {recipient.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{recipient.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeRecipient(recipient.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Separator />
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">{t('screens.messages.attachments')}</span>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="flex items-center gap-2 pr-1 max-w-40"
                >
                  {file.type.startsWith('image/') ? (
                    <Image className="w-3 h-3" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  <span className="text-xs truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Separator />
          </div>
        )}

        {/* Message Input */}
        <div className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="min-h-20 resize-none border-0 bg-muted/30 focus-visible:ring-1"
            rows={3}
          />
          
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleAttachment('file')}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleAttachment('image')}
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {message.length}/1000
              </span>
              <Button 
                onClick={handleSend}
                disabled={!message.trim() && attachments.length === 0}
                size="sm"
                className="h-8"
              >
                <Send className="w-4 h-4 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}