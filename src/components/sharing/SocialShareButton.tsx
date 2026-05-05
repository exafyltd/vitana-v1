import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  MessageCircle,
  Loader2,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useSocialPlatforms, SocialPlatform } from "@/hooks/useSocialPlatforms";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { PersonalShareButtons } from "@/components/sharing/PersonalShareButtons";
import { InstagramShareModal } from "@/components/sharing/InstagramShareModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useNativeShare } from "@/hooks/useNativeShare";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface SocialShareButtonProps {
  type: 'service' | 'event' | 'referral' | 'live_room';
  data: {
    id?: string;
    title: string;
    description: string;
    price?: number;
    currency?: string;
    link?: string;
    referralCode?: string;
    image_url?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
  };
  variant?: 'button' | 'icon';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export default function SocialShareButton({ 
  type, 
  data, 
  variant = 'button',
  size = 'default',
  className
}: SocialShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { allPlatforms, loading } = useSocialPlatforms();
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const { isAvailable: canNativeShare, share: nativeShare } = useNativeShare({
    contentId: data.id || type,
    contentType: type,
  });

  const getShareText = () => {
    switch (type) {
      case 'service':
        return `🌟 Check out this service: ${data.title}\n${data.description}\n${data.price ? `Only ${data.currency === 'credits' ? data.price + ' credits' : '$' + data.price}` : ''}`;
      case 'event':
        return `🎉 Join me at: ${data.title}\n${data.description}\n${data.price ? `Registration: ${data.currency === 'credits' ? data.price + ' credits' : '$' + data.price}` : 'Free event!'}`;
      case 'referral':
        return `💎 Join Vitana and get started with wellness!\nUse my referral code: ${data.referralCode}\n${data.description}`;
      case 'live_room':
        return `🎙️ Join this live discussion: ${data.title}\n${data.description}`;
      default:
        return `Check this out: ${data.title}`;
    }
  };

  const getShareLink = () => {
    return data.link || `https://vitana.app/share/${type}/${data.title.toLowerCase().replace(/ /g, '-')}${data.referralCode ? '?ref=' + data.referralCode : ''}`;
  };

  const shareText = getShareText();
  const shareLink = getShareLink();

  const handlePlatformClick = (platform: SocialPlatform) => {
    try {
      if (platform.id === 'messenger') {
        notify('toasts.sharing.openingMessenger', 'toasts.sharing.shareViaVitanaMessenger');
        navigate('/messenger');
        setIsOpen(false);
        return;
      }

      if (!platform.connected && platform.supportsDirectShare) {
        const shareUrls: Record<string, string> = {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareText)}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`,
          instagram: `https://www.instagram.com/`,
        };
        
        if (shareUrls[platform.id]) {
          window.open(shareUrls[platform.id], '_blank', 'width=600,height=400');
          notify('toasts.sharing.shareOpened');
        }
        return;
      }

      if (!platform.connected) {
        notify('toasts.sharing.connectAccount');
        return;
      }

      // Handle connected platforms
      const handlers: Record<string, () => void> = {
        facebook: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareText)}`, '_blank'),
        twitter: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`, '_blank'),
        linkedin: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`, '_blank'),
        instagram: () => {
          // Open Instagram share modal for better experience
          setIsInstagramModalOpen(true);
        },
        youtube: async () => {
          await navigator.clipboard.writeText(shareLink);
          notify('toasts.sharing.youtube', 'toasts.sharing.linkCopiedShareYoutube');
        },
        tiktok: async () => {
          await navigator.clipboard.writeText(shareLink);
          notify('toasts.sharing.tiktok', 'toasts.sharing.linkCopiedShareTiktok');
        },
      };

      handlers[platform.id]?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Share error:', error);
      notifyError('toasts.sharing.shareFailed', 'toasts.sharing.pleaseTryAgain');
    }
  };

  const handleConnectPlatform = () => {
    setIsOpen(false);
    navigate(`/profile/${user?.id}#social-connections`);
  };

  // Social media platforms only (no email/sms/whatsapp)
  const socialChannels = useMemo(() => {
    const messenger: SocialPlatform = {
      id: "messenger",
      name: "Vitana Messenger",
      icon: MessageCircle,
      color: "text-blue-600",
      connected: true,
      supportsDirectShare: false,
      supportsAutomation: false,
    };

    return [messenger, ...allPlatforms];
  }, [allPlatforms]);

  return (
    <>
      <Button
        variant={variant === 'icon' ? 'ghost' : 'outline'}
        size={size}
        disabled={isSharing}
        onClick={async () => {
          if (isSharing) return;
          if (canNativeShare) {
            setIsSharing(true);
            const result = await nativeShare({
              title: data.title,
              text: shareText,
              url: shareLink,
            });
            setIsSharing(false);
            if (result === "failed") {
              setIsOpen(true);
            }
            return;
          }
          setIsOpen(true);
        }}
        className={variant === 'icon' ? `p-2 ${className || ''}` : className}
      >
        <Share2 className="w-4 h-4" />
        {variant === 'button' && <span className="ml-2">{translate('common.share', 'Share')}</span>}
      </Button>

      {/* Instagram Share Modal */}
      <InstagramShareModal
        open={isInstagramModalOpen}
        onOpenChange={setIsInstagramModalOpen}
        event={{
          id: data.id || "",
          title: data.title,
          description: data.description,
          image_url: data.image_url,
          start_time: data.start_time,
          end_time: data.end_time,
          location: data.location,
        }}
        shareUrl={shareLink}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto [&>button]:not-sr-only [&>button]:absolute [&>button]:right-4 [&>button]:top-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Share {type.charAt(0).toUpperCase() + type.slice(1)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview Card */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{data.title}</h4>
                    <span className="text-xs capitalize text-muted-foreground">{type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {data.description}
                  </p>
                  {data.price && (
                    <div className="text-sm font-medium text-primary">
                      {data.currency === 'credits' ? `${data.price} credits` : `$${data.price}`}
                    </div>
                  )}
                  {data.referralCode && (
                    <div className="text-xs text-muted-foreground">
                      Code: {data.referralCode}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Share (Personal) - Using unified component */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('screens.sharing.quickSharePersonal')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Opens your personal apps - no setup needed
              </p>
              <PersonalShareButtons
                shareUrl={shareLink}
                shareText={shareText}
                title={data.title}
                variant="grid"
                showNativeShare={canNativeShare}
                onNativeShare={async () => {
                  const result = await nativeShare({
                    title: data.title,
                    text: shareText,
                    url: shareLink,
                  });
                  if (result === "shared") setIsOpen(false);
                }}
              />
            </div>

            {/* Social Media (Auto-Post) */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('screens.sharing.socialMediaAutopost2')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Select connected accounts to share automatically
              </p>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {socialChannels.map((option) => {
                    const Icon = option.icon;
                    const isConnected = option.connected;

                    return (
                      <div key={option.id} className="relative">
                        <Button
                          variant="outline"
                          className={`w-full flex flex-col items-center gap-1.5 h-auto py-3 ${
                            isConnected 
                              ? "hover:bg-accent hover:border-primary" 
                              : "border-dashed border-muted-foreground/30"
                          }`}
                          onClick={() => handlePlatformClick(option)}
                        >
                          <div className="relative">
                            <Icon className={`h-5 w-5 ${isConnected ? option.color : "text-muted-foreground"}`} />
                            {isConnected && (
                              <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-600 bg-background rounded-full" />
                            )}
                          </div>
                          <span className={`text-[10px] ${!isConnected && "text-muted-foreground"}`}>
                            {option.name}
                          </span>
                          {isConnected ? (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              Connect
                            </Badge>
                          )}
                        </Button>
                        
                        {!isConnected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectPlatform();
                            }}
                            className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-background border border-border hover:border-primary transition-colors"
                            title={`Connect ${option.name}`}
                          >
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
