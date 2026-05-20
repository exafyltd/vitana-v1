import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Trash2, CheckCircle2 } from "lucide-react";
import { Contact } from "@/hooks/useContacts";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogTrigger,
} from "@/components/ui/responsive-confirm-dialog";
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
interface ContactListItemProps {
  contact: Contact;
  onMessage?: (userId: string) => void;
  onInvite?: (contactId: string) => void;
  onDelete?: (contactId: string) => void;
  variant: "on-platform" | "invite";
}

export default function ContactListItem({ 
  contact, 
  onMessage, 
  onInvite, 
  onDelete,
  variant 
}: ContactListItemProps) {
  const displayName = contact.is_on_platform && contact.contact_profile?.display_name
    ? contact.contact_profile.display_name
    : contact.contact_name;

  const avatarUrl = contact.is_on_platform && contact.contact_profile?.avatar_url
    ? contact.contact_profile.avatar_url
    : undefined;

  // Debug logging
  if (contact.is_on_platform) {
    console.log("🎨 ContactListItem render:", {
      name: displayName,
      has_profile: !!contact.contact_profile,
      avatar_url: avatarUrl,
      is_on_platform: contact.is_on_platform
    });
  }

  const contactInfo = contact.contact_phone || contact.contact_email;

  return (
    <Card className="p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={avatarUrl} alt={displayName} loading="lazy" />
          <AvatarFallback className={contact.is_on_platform ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground font-medium"}>
            {displayName[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{displayName}</h4>
            {contact.is_on_platform && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t('screens.contacts.vitana')}
              </Badge>
            )}
          </div>
          {contactInfo && (
            <p className="text-sm text-muted-foreground truncate">{contactInfo}</p>
          )}
          {contact.invite_sent_at && !contact.is_on_platform && (
            <p className="text-xs text-muted-foreground mt-1">{t('screens.contacts.invitedValue0', { value0: fmtDate(new Date(contact.invite_sent_at)) })}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {variant === "on-platform" && onMessage && contact.contact_user_id && (
            <Button
              size="sm"
              onClick={() => onMessage(contact.contact_user_id!)}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {t('screens.contacts.message')}
            </Button>
          )}

          {variant === "invite" && onInvite && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onInvite(contact.id)}
              disabled={!!contact.invite_sent_at}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {contact.invite_sent_at ? "Invited" : "Invite"}
            </Button>
          )}

          {onDelete && (
            <ResponsiveConfirmDialog>
              <ResponsiveConfirmDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </ResponsiveConfirmDialogTrigger>
              <ResponsiveConfirmDialogContent>
                <ResponsiveConfirmDialogHeader>
                  <ResponsiveConfirmDialogTitle>{t('screens.contacts.deleteContact')}</ResponsiveConfirmDialogTitle>
                  <ResponsiveConfirmDialogDescription>{t('screens.contacts.youSureYouWantDeleteDisplayname', { displayName })}
                  </ResponsiveConfirmDialogDescription>
                </ResponsiveConfirmDialogHeader>
                <ResponsiveConfirmDialogFooter>
                  <ResponsiveConfirmDialogCancel>{t('screens.contacts.cancel')}</ResponsiveConfirmDialogCancel>
                  <ResponsiveConfirmDialogAction
                    onClick={() => onDelete(contact.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >{t('screens.contacts.delete')}
                  </ResponsiveConfirmDialogAction>
                </ResponsiveConfirmDialogFooter>
              </ResponsiveConfirmDialogContent>
            </ResponsiveConfirmDialog>
          )}
        </div>
      </div>
    </Card>
  );
}
