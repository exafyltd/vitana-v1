/**
 * SELL EVENT MODAL
 * 
 * Displays a reseller's unique tracking link for an event. Enables sharing via:
 * - Copy to clipboard
 * - WhatsApp (via wa.me protocol)
 * - Instagram (mobile share sheet / desktop download)
 * - Campaign Builder navigation
 * 
 * RESELLER ATTRIBUTION FLOW:
 * 1. getResellerShareUrl() generates URL with utm_source=reseller_<CODE>
 * 2. When buyer clicks link, UTM params are captured on PublicEventLanding
 * 3. UTM params pass through EventTicketSelector → stripe-create-ticket-checkout
 * 4. stripe-webhook extracts reseller code and creates reseller_attributions record
 * 5. Commission = sale_amount × event.default_reseller_commission_rate
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Share2, Megaphone, Check } from "lucide-react";
import { getResellerShareUrl } from "@/lib/shareUrl";
import { useNavigate } from "react-router-dom";
import { siWhatsapp, siInstagram } from "simple-icons";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface SellEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    image_url?: string | null;
    slug?: string | null;
  } | null;
  resellerCode: string;
}

export function SellEventModal({ 
  open, 
  onOpenChange, 
  event, 
  resellerCode 
}: SellEventModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const shareUrl = getResellerShareUrl("event", event.id, resellerCode, event.slug || undefined);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notifySuccess('toasts.reseller.linkCopiedClipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      notifyError('toasts.reseller.failedCopyPleaseSelectCopyManually');
    }
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `Check out this event: ${event.title}\n\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing, so we copy and inform user
    navigator.clipboard.writeText(shareUrl).then(() => {
      notifySuccess('toasts.reseller.linkCopiedPasteItYourInstagram');
    }).catch(() => {
      notifyError('toasts.reseller.failedCopyLink');
    });
  };

  const handleOpenCampaignBuilder = () => {
    onOpenChange(false);
    navigate(`/sharing/campaigns?promote=event&eventId=${event.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            {t('screens.reseller.sellThisEvent')}
          </DialogTitle>
          <DialogDescription>
            {t('screens.reseller.shareYourUniqueResellerLinkEarn')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Event Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            {event.image_url ? (
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {t('screens.reseller.yourResellerCode')} <span className="font-mono font-medium text-primary">{resellerCode}</span>
              </p>
            </div>
          </div>

          {/* Share Link Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('screens.reseller.yourUniqueResellerLink')}</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-xs bg-background"
                onFocus={(e) => e.target.select()}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleCopyLink}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('screens.reseller.quickShare')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="h-12 gap-2 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:bg-green-100 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800"
                onClick={handleWhatsAppShare}
              >
                <svg 
                  role="img" 
                  viewBox="0 0 24 24" 
                  className="h-5 w-5" 
                  fill="#25D366"
                >
                  <path d={siWhatsapp.path} />
                </svg>
                <span className="text-green-700 dark:text-green-300">{t('screens.reseller.whatsapp')}</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-12 gap-2 bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200 hover:bg-pink-100 dark:from-pink-950/30 dark:to-purple-950/30 dark:border-pink-800"
                onClick={handleInstagramShare}
              >
                <svg 
                  role="img" 
                  viewBox="0 0 24 24" 
                  className="h-5 w-5" 
                  fill="#E4405F"
                >
                  <path d={siInstagram.path} />
                </svg>
                <span className="text-pink-700 dark:text-pink-300">{t('screens.reseller.instagram')}</span>
              </Button>
            </div>
          </div>

          {/* Campaign Builder CTA */}
          <div className="pt-2 border-t border-border/50">
            <Button 
              className="w-full h-12 gap-2 bg-gradient-to-r from-primary to-primary/80"
              onClick={handleOpenCampaignBuilder}
            >
              <Megaphone className="h-5 w-5" />
              {t('screens.reseller.openCampaignBuilder')}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t('screens.reseller.createFullMarketingCampaignWithEmail')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
