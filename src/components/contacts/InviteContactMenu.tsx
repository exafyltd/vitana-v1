import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Send, Mail, MessageSquare, Share2 } from "lucide-react";
import { Contact } from "@/hooks/useContacts";
import { t } from '@/lib/i18n-toast';

interface InviteContactMenuProps {
  contact: Contact;
  onInvite: (contactId: string, channel: 'sms' | 'email') => void;
}

export default function InviteContactMenu({ contact, onInvite }: InviteContactMenuProps) {
  const handleShare = async () => {
    const shareText = `Hey ${contact.contact_name}! Join me on VITANA - it's a great platform for health and wellness. Download the app: https://vitana.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join VITANA",
          text: shareText,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('screens.contacts.sendInviteVia')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {contact.contact_phone && (
          <DropdownMenuItem onClick={() => onInvite(contact.id, 'sms')}>
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS Text Message
          </DropdownMenuItem>
        )}
        
        {contact.contact_email && (
          <DropdownMenuItem onClick={() => onInvite(contact.id, 'email')}>
            <Mail className="w-4 h-4 mr-2" />
            Email Invitation
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
