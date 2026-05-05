import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Info,
  Loader2,
  Send,
  Plus,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useSocialPlatforms, SocialPlatform } from "@/hooks/useSocialPlatforms";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { useAuth } from "@/context/AuthProvider";
import { getShareUrl } from "@/lib/shareUrl";
import { useNativeShare } from "@/hooks/useNativeShare";
import { PersonalShareButtons } from "./PersonalShareButtons";
import type { ShareableContent } from "@/types/sharing";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface ShareChannel extends SocialPlatform {
  isVitanaMessenger?: boolean;
}

interface UniversalShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ShareableContent;
}

export function UniversalShareDialog({
  open,
  onOpenChange,
  content,
}: UniversalShareDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allPlatforms, loading } = useSocialPlatforms();
  const [message, setMessage] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  const { isAvailable: canNativeShare, share: nativeShare } = useNativeShare({
    contentId: content.id,
    contentType: content.type,
  });

  // Build social media channels array (for auto-post)
  const socialChannels: ShareChannel[] = useMemo(() => {
    const vitanaMessenger: ShareChannel = {
      id: "vitana_messenger",
      name: "Vitana Messenger",
      icon: MessageCircle,
      color: "text-blue-600",
      connected: true,
      supportsDirectShare: false,
      supportsAutomation: false,
      isVitanaMessenger: true,
    };

    // Filter to only social platforms (not messaging channels)
    const socialOnly = allPlatforms.filter(p => 
      ['linkedin', 'instagram', 'facebook', 'twitter', 'youtube', 'tiktok'].includes(p.id)
    );

    return [vitanaMessenger, ...socialOnly];
  }, [allPlatforms]);

  // Get share URL and text for personal sharing
  const shareUrl = content.url || getShareUrl(
    content.type as 'event' | 'meetup' | 'group' | 'profile' | 'post',
    content.id,
    { utm_source: 'share', utm_medium: 'personal', slug: content.slug }
  );
  
  const shareText = `${content.title}${content.description ? '\n' + content.description : ''}`;

  const handleChannelClick = (channel: ShareChannel) => {
    if (channel.connected) {
      setSelectedChannels((prev) =>
        prev.includes(channel.id)
          ? prev.filter((id) => id !== channel.id)
          : [...prev, channel.id]
      );
    } else {
      notify('toasts.sharing.connectAccount');
    }
  };

  const handleConnectPlatform = (platformId: string) => {
    onOpenChange(false);
    navigate(`/profile/${user?.id}#social-connections`);
  };

  const handleBlastNow = async () => {
    const distributionChannels = selectedChannels.filter(
      (id) => id !== "vitana_messenger"
    );

    if (distributionChannels.length === 0) {
      notifyError('toasts.sharing.selectDistributionChannels', 'toasts.sharing.pleaseSelectAtLeastOneChannel3');
      return;
    }

    setIsSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: `Quick Share - ${content.title}`,
          user_id: user.id,
          status: "active",
          description: message || `Sharing ${content.type}: ${content.title}`,
          target_channels: distributionChannels.reduce((acc, channel) => ({
            ...acc,
            [channel]: true,
          }), {}),
          distribution_config: {
            frequency: "once",
            smart_scheduling_enabled: false,
          },
          metadata: {
            content_type: content.type,
            content_id: content.id,
            content_title: content.title,
          },
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      notify('toasts.sharing.blastSuccessful');

      analytics.trackShare('share_completed', 'universal', content.id, content.type);
      onOpenChange(false);
    } catch (error) {
      console.error("Share error:", error);
      notifyError('toasts.sharing.shareFailed2', 'toasts.sharing.failedShareContentPleaseTryAgain');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreateCampaign = () => {
    const url = `/sharing/campaigns?prefill=${encodeURIComponent(
      JSON.stringify({
        name: `Campaign - ${content.title}`,
        description: message,
        content_type: content.type,
        content_id: content.id,
      })
    )}`;
    // SPA-safe navigation
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[60]" overlayClassName="z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Share {content.type}
          </DialogTitle>
          <DialogDescription>
            Share personally or distribute across your connected channels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Preview */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex gap-4">
              {content.image_url && (
                <img
                  src={content.image_url}
                  alt={content.title}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h4 className="font-semibold">{content.title}</h4>
                {content.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {content.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Quick Share (Personal) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">{t('screens.sharing.quickSharePersonal2')}</h3>
              <Badge variant="secondary" className="text-[10px]">{t('screens.sharing.noSetupNeeded')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Opens your personal apps to share directly with friends and contacts
            </p>
            <PersonalShareButtons
              shareUrl={shareUrl}
              shareText={message || shareText}
              title={content.title}
              variant="grid"
              showNativeShare={canNativeShare}
              onNativeShare={async () => {
                const result = await nativeShare({
                  title: content.title,
                  text: message || shareText,
                  url: shareUrl,
                });
                if (result === "shared") onOpenChange(false);
              }}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">{t('screens.sharing.customMessageOptional')}</Label>
            <Textarea
              id="message"
              placeholder={t('screens.sharing.addCustomMessageYourShare')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
          </div>

          {/* Section 2: Social Media (Auto-Post) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('screens.sharing.socialMediaAutopost')}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {selectedChannels.length} selected
              </Badge>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Select connected accounts to auto-post. Click <strong>+</strong> to connect new accounts.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {socialChannels.map((channel) => {
                    const Icon = channel.icon;
                    const isSelected = selectedChannels.includes(channel.id);
                    const isConnected = channel.connected;

                    return (
                      <div key={channel.id} className="relative">
                        <button
                          type="button"
                          onClick={() => handleChannelClick(channel)}
                          className={`w-full flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                            isSelected && isConnected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : isConnected
                              ? "border-border hover:border-primary/50 hover:bg-accent/50"
                              : "border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/30"
                          }`}
                        >
                          <div className="relative">
                            <Icon className={`h-6 w-6 ${isConnected ? channel.color : "text-muted-foreground"}`} />
                            {isConnected && (
                              <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-green-600 bg-background rounded-full" />
                            )}
                          </div>
                          <span className={`text-xs font-medium text-center ${!isConnected && "text-muted-foreground"}`}>
                            {channel.name}
                          </span>
                        </button>
                        
                        {!isConnected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectPlatform(channel.id);
                            }}
                            className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-background border border-border hover:border-primary transition-colors"
                            title={`Connect ${channel.name}`}
                          >
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCreateCampaign}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleBlastNow}
              disabled={selectedChannels.length === 0 || isSharing}
            >
              {isSharing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Blast Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
