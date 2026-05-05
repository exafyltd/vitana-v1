import { useState } from "react";
import { Mail, MessageSquare, MessageCircle, Link2, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Contact } from "@/hooks/useContacts";
import { t } from '@/lib/i18n-toast';

type InviteChannel = "sms" | "email" | "whatsapp" | "share";

interface ChannelConfig {
  id: InviteChannel;
  name: string;
  icon: React.ReactNode;
  available: boolean;
  charLimit?: number;
}

interface InviteComposerProps {
  selectedContacts: Contact[];
  onSend: (message: string, channel: InviteChannel) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const channels: ChannelConfig[] = [
  { id: "sms", name: "SMS", icon: <MessageSquare className="w-4 h-4" />, available: true, charLimit: 160 },
  { id: "email", name: "Email", icon: <Mail className="w-4 h-4" />, available: true },
  { id: "whatsapp", name: "WhatsApp", icon: <MessageCircle className="w-4 h-4" />, available: true },
  { id: "share", name: "Share Link", icon: <Link2 className="w-4 h-4" />, available: true },
];

const defaultMessage = `Hey! I've been using VITANA for my wellness journey and thought you'd love it too. Join me and let's support each other! 🌟

Join here: {{invite_link}}`;

export function InviteComposer({ selectedContacts, onSend, onCancel, isLoading }: InviteComposerProps) {
  const [selectedChannel, setSelectedChannel] = useState<InviteChannel>("sms");
  const [message, setMessage] = useState(defaultMessage);

  const currentChannel = channels.find(c => c.id === selectedChannel);
  const charLimit = currentChannel?.charLimit;
  const isOverLimit = charLimit && message.length > charLimit;

  const smsCount = selectedContacts.filter(c => c.contact_phone).length;
  const emailCount = selectedContacts.filter(c => c.contact_email).length;

  const getChannelRecipientsCount = (channel: InviteChannel): number => {
    switch (channel) {
      case "sms":
      case "whatsapp":
        return smsCount;
      case "email":
        return emailCount;
      case "share":
        return selectedContacts.length;
      default:
        return 0;
    }
  };

  const handleSend = () => {
    if (!isOverLimit) {
      onSend(message, selectedChannel);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Recipients summary */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Sending to{" "}
          <span className="font-medium text-foreground">
            {selectedContacts.length} contact{selectedContacts.length !== 1 ? "s" : ""}
          </span>
        </span>
      </div>

      {/* Channel selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('screens.contacts.sendVia')}</label>
        <div className="flex gap-2">
          {channels.map((channel) => {
            const recipientCount = getChannelRecipientsCount(channel.id);
            const isDisabled = channel.id !== "share" && recipientCount === 0;

            return (
              <button
                key={channel.id}
                onClick={() => !isDisabled && setSelectedChannel(channel.id)}
                disabled={isDisabled}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
                  selectedChannel === channel.id
                    ? "bg-[hsl(var(--contact-sync-tint))] border-[hsl(var(--contact-sync-accent))] ring-1 ring-[hsl(var(--contact-sync-accent)/0.3)]"
                    : "bg-card border-border/50 hover:bg-muted/50",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  selectedChannel === channel.id
                    ? "bg-[hsl(var(--contact-sync-accent)/0.15)] text-[hsl(var(--contact-sync-accent))]"
                    : "bg-muted text-muted-foreground"
                )}>
                  {channel.icon}
                </div>
                <span className="text-xs font-medium">{channel.name}</span>
                {channel.id !== "share" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {recipientCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message composer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Message</label>
          {charLimit && (
            <span className={cn(
              "text-xs",
              isOverLimit ? "text-destructive" : "text-muted-foreground"
            )}>
              {message.length}/{charLimit}
            </span>
          )}
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your invite message..."
          className={cn(
            "min-h-[120px] resize-none",
            isOverLimit && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <p className="text-xs text-muted-foreground">
          Tip: Use {"{{invite_link}}"} to include your personal invite link
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={isOverLimit || isLoading || getChannelRecipientsCount(selectedChannel) === 0}
          className="flex-1 bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
        >
          {isLoading ? (
            "Sending..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Invites
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export default InviteComposer;
