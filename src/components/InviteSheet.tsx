import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { communityFetch } from "@/lib/community-gateway";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

export const REFERRAL_OPEN_EVENT = "referral:open";

interface ShareLinkResponse {
  ok: boolean;
  link?: {
    id: string;
    short_code: string;
    url: string;
    whatsapp_url: string;
  };
  error?: string;
}

/**
 * Friend-invite sheet. Calls the gateway's existing
 * `/api/v1/automations/sharing/generate-link` endpoint with `target_type:
 * 'profile'` so each open mints (or returns) a real trackable share link.
 * Wired to the `referral:open` event so any milestone CTA (tier-up,
 * streak_7+) can request it without prop-drilling.
 */
export function InviteSheet() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<ShareLinkResponse["link"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(REFERRAL_OPEN_EVENT, handler);
    return () => window.removeEventListener(REFERRAL_OPEN_EVENT, handler);
  }, []);

  const fetchLink = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await communityFetch("/api/v1/automations/sharing/generate-link", {
        method: "POST",
        body: JSON.stringify({
          target_type: "profile",
          target_id: user.id,
          utm_campaign: "vitana_index_referral",
        }),
      });
      const json = (await resp.json()) as ShareLinkResponse;
      if (!resp.ok || !json.ok || !json.link) {
        setError(json.error ?? "Couldn't generate an invite link.");
      } else {
        setLink(json.link);
      }
    } catch (err: any) {
      setError(err?.message ?? "Couldn't generate an invite link.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Lazily fetch the link the first time the sheet opens. We re-fetch on each
  // open so the UI never shows a stale link if the share table evolves.
  useEffect(() => {
    if (open && !link && !loading && user?.id) {
      fetchLink();
    }
  }, [open, link, loading, user?.id, fetchLink]);

  const handleCopy = async () => {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      notifySuccess('toasts.common.inviteLinkCopied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError('toasts.common.couldnTCopyPleaseCopyLink');
    }
  };

  const handleWhatsApp = () => {
    if (!link?.whatsapp_url) return;
    window.location.href = link.whatsapp_url;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">{t('screens.common.bringFriendAlong')}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {t('screens.common.journeyBetterTogetherShareYourInvite')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border ring-1 ring-border/60 p-3 bg-muted/40 min-h-[64px] flex items-center">
            {loading ? (
              <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('screens.common.generatingYourInviteLink')}
              </span>
            ) : error ? (
              <span className="text-sm text-destructive">{error}</span>
            ) : link?.url ? (
              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-1">{t('screens.common.yourInviteLink')}</p>
                <p className="text-sm font-mono break-all">{link.url}</p>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{t('screens.common.noLinkYet')}</span>
            )}
          </div>

          <Button onClick={handleCopy} disabled={!link?.url || loading} className="w-full">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                {t('screens.common.copyInviteLink')}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleWhatsApp}
            disabled={!link?.whatsapp_url || loading}
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t('screens.common.shareWhatsapp')}
          </Button>

          {error && (
            <Button variant="ghost" onClick={fetchLink} className="w-full">
              {t('screens.common.tryAgain2')}
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {t('screens.common.eachShareTrackedSoWhenFriend')}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default InviteSheet;
