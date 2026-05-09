import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, MessageCircle, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { getShareUrl } from "@/lib/shareUrl";
import { cn } from "@/lib/utils";
import { lookup, notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface ManualShareActionsProps {
  campaignId: string;
  campaignTitle: string;
  campaignDescription: string;
  className?: string;
}

export function ManualShareActions({ 
  campaignId, 
  campaignTitle, 
  campaignDescription,
  className 
}: ManualShareActionsProps) {
  const [copying, setCopying] = useState(false);

  const shareUrl = getShareUrl('campaign', campaignId, {
    utm_source: 'manual_share',
    utm_medium: 'direct',
    utm_campaign: campaignId,
  });

  const shareMessage = `Join me at: ${campaignTitle}\n${campaignDescription}\n\n${shareUrl}`;
  const encodedMessage = encodeURIComponent(shareMessage);

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      notifySuccess('toasts.sharing.linkCopied');
    } catch (error) {
      notifyError('toasts.sharing.failedCopyLink');
    } finally {
      setTimeout(() => setCopying(false), 1000);
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    notifySuccess('toasts.sharing.openingWhatsapp');
  };

  const handleViberShare = async () => {
    const viberUrl = `viber://forward?text=${encodedMessage}`;
    
    // Track if Viber opened successfully
    let viberOpened = false;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        viberOpened = true;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Try to open Viber
    window.location.href = viberUrl;
    
    // Check after a delay if Viber opened
    setTimeout(async () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (viberOpened) {
        notifySuccess('toasts.sharing.openingViber');
      } else {
        // Viber didn't open - copy link to clipboard as fallback
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.info(lookup('toasts.sharing.viberNotDetectedLinkCopiedClipboard'), {
            description: "Paste it manually in your Viber chat"
          });
        } catch {
          notifyError('toasts.sharing.viberNotDetectedPleaseCopyLink');
        }
      }
    }, 1500);
  };

  const handleEmailShare = () => {
    const emailUrl = `mailto:?subject=${encodeURIComponent(campaignTitle)}&body=${encodedMessage}`;
    window.location.href = emailUrl;
    notifySuccess('toasts.sharing.openingEmailClient');
  };

  const handleSmsShare = () => {
    const smsUrl = `sms:?body=${encodedMessage}`;
    window.location.href = smsUrl;
    notifySuccess('toasts.sharing.openingMessagingApp');
  };

  const shareOptions = [
    {
      key: 'copy_link',
      name: 'Copy Link',
      icon: Link2,
      color: 'bg-slate-500',
      onClick: handleCopyLink,
      recommended: false,
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp (Personal Share)',
      icon: MessageCircle,
      color: 'bg-green-500',
      onClick: handleWhatsAppShare,
      recommended: true,
    },
    {
      key: 'viber',
      name: 'Viber',
      icon: MessageCircle,
      color: 'bg-purple-500',
      onClick: handleViberShare,
      recommended: false,
    },
    {
      key: 'email',
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600',
      onClick: handleEmailShare,
      recommended: false,
    },
    {
      key: 'sms',
      name: 'SMS',
      icon: Phone,
      color: 'bg-green-600',
      onClick: handleSmsShare,
      recommended: false,
    },
  ];

  return (
    <div className={cn("grid gap-3", className)}>
      {shareOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Card
            key={option.key}
            className={cn(
              "group relative overflow-hidden transition-all duration-200",
              "bg-card/60 backdrop-blur-sm border-2 hover:border-primary/40 hover:shadow-lg",
              "cursor-pointer"
            )}
            onClick={option.onClick}
          >
            <div className="flex items-center gap-3 p-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0",
                "shadow-md group-hover:scale-110 transition-transform duration-200",
                option.color
              )}>
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{option.name}</span>
                  {option.recommended && (
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                    >
                      {t('screens.sharing.recommended')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {option.key === 'copy_link' && 'Copy link to share anywhere'}
                  {option.key === 'whatsapp' && 'Share with your WhatsApp contacts'}
                  {option.key === 'viber' && 'Share via Viber messenger'}
                  {option.key === 'email' && 'Opens your email client'}
                  {option.key === 'sms' && 'Opens your messaging app'}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  option.onClick();
                }}
              >{t('screens.sharing.share')}
              </Button>
            </div>

            {copying && option.key === 'copy_link' && (
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{t('screens.sharing.copied')}</span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
