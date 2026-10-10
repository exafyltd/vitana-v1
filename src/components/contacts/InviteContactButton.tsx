import { useState } from "react";
import { Loader2, Mail, MessageCircle, MessageSquare, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthProvider";
import {
  availableChannels,
  fetchMyInviteLink,
  markContactInvited,
  openInviteChannel,
  type InviteChannel,
  type InviteTarget,
} from "@/lib/contact-invite-links";
import { notify, notifyError, t } from "@/lib/i18n-toast";

const ICONS: Record<InviteChannel, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-4 h-4" aria-hidden />,
  sms: <MessageSquare className="w-4 h-4" aria-hidden />,
  email: <Mail className="w-4 h-4" aria-hidden />,
  share: <Share2 className="w-4 h-4" aria-hidden />,
};

interface InviteContactButtonProps {
  target: InviteTarget;
  invited?: boolean;
  onInvited?: (contactId: string) => void;
}

/**
 * VTID-05058: one tap → pick WhatsApp / SMS / e-mail / share → the member's
 * own app opens with their personal invite link in the message. Nothing is
 * sent by Vitanaland; the contact is marked invited once the channel opened.
 */
export function InviteContactButton({ target, invited, onInvited }: InviteContactButtonProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const invite = async (channel: InviteChannel) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      let link: string;
      try {
        link = await fetchMyInviteLink(user.id);
      } catch {
        notifyError("mailhub.findFriends.invite.linkFailed");
        return;
      }
      const firstName = target.name.split(" ")[0] || target.name;
      const message = t("mailhub.findFriends.invite.message", { name: firstName, link });
      const opened = await openInviteChannel(channel, target, message);
      if (!opened) return;
      await markContactInvited(user.id, target.id).catch((err) => console.error("[InviteContactButton] mark invited failed:", err));
      onInvited?.(target.id);
      notify("mailhub.findFriends.invite.opened");
    } catch (err) {
      console.error("[InviteContactButton] invite failed:", err);
      notifyError("mailhub.findFriends.errors.unknown.title");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant={invited ? "ghost" : "outline"}
          data-testid={`invite-contact-${target.id}`}
          aria-label={t(invited ? "mailhub.findFriends.results.invited" : "mailhub.findFriends.results.invite")}
          className="flex items-center gap-2 h-10 min-w-10 px-2.5 sm:px-3 shrink-0"
          disabled={busy}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4 rtl:-scale-x-100" aria-hidden />}
          <span className="sr-only sm:not-sr-only">
            {t(invited ? "mailhub.findFriends.results.invited" : "mailhub.findFriends.results.invite")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {availableChannels(target).map((channel) => (
          <DropdownMenuItem
            key={channel}
            data-testid={`invite-channel-${channel}`}
            onSelect={() => void invite(channel)}
            className="gap-2 min-h-10"
          >
            {ICONS[channel]}
            {t(`mailhub.findFriends.invite.${channel}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default InviteContactButton;
