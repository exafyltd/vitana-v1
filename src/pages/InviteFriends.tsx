import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import ContactsTabContent from "@/components/contacts/ContactsTabContent";
import { fetchMyInviteLink } from "@/lib/contact-invite-links";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

/**
 * VTID-05058 — Invite friends.
 *
 * Was a separate import screen whose "Send invites" only stamped a date and
 * said "N invites sent!" in English, while nothing was sent. Now: the
 * member's personal invite link (copy / share), and the same contacts list
 * as Messages → Contacts — "Find friends" imports with one tap, members get
 * Message, everyone else gets Invite, which opens the member's own WhatsApp /
 * SMS / e-mail with the link.
 */
export default function InviteFriends() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchMyInviteLink(user.id)
      .then((url) => { if (!cancelled) setLink(url); })
      .catch(() => { if (!cancelled) setLinkError(true); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const message = link ? t('mailhub.findFriends.invite.messageGeneric', { link }) : "";

  const handleCopy = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      notifySuccess('toasts.common.inviteLinkCopied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError('toasts.common.couldnTCopyPleaseCopyLink');
    }
  }, [link]);

  const handleShare = useCallback(async () => {
    if (!message) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        // The member closed the share sheet.
      }
      return;
    }
    window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [message]);

  return (
    <AppLayout>
      <SEO title={t('screens.invitefriends.inviteFriends')} />
      <div className={`min-h-screen bg-gradient-subtle ${isMobile ? "p-4 pb-24" : "p-6"}`}>
        <div className={isMobile ? "" : "max-w-3xl mx-auto"}>
          <StandardHeader
            title={t('screens.invitefriends.inviteFriends')}
            description={t('mailhub.findFriends.page.description')}
            emoji="🎯"
          />

          <Card className="mb-6" data-testid="invite-link-card">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">{t('screens.common.yourInviteLink')}</p>
              <div className="rounded-xl border ring-1 ring-border/60 p-3 bg-muted/40 min-h-12 flex items-center">
                {link ? (
                  <p className="text-sm font-mono break-all" dir="ltr">{link}</p>
                ) : linkError ? (
                  <p className="text-sm text-destructive">{t('mailhub.findFriends.invite.linkFailed')}</p>
                ) : (
                  <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    {t('screens.common.generatingYourInviteLink')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCopy} disabled={!link} className="min-h-11">
                  {copied ? <Check className="w-4 h-4 me-2" aria-hidden /> : <Copy className="w-4 h-4 me-2" aria-hidden />}
                  {t(copied ? 'screens.common.copied' : 'screens.common.copyInviteLink')}
                </Button>
                <Button onClick={handleShare} disabled={!link} className="min-h-11">
                  <Share2 className="w-4 h-4 me-2 rtl:-scale-x-100" aria-hidden />
                  {t('mailhub.findFriends.invite.share')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col min-h-[40vh]">
            <ContactsTabContent
              messageContext="global"
              onStartConversation={(userId) => navigate(`/inbox/u/${userId}`)}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
