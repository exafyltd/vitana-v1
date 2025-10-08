import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Share2,
  Copy,
  MessageCircle,
  Info,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Link2,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocialPlatforms, SocialPlatform } from "@/hooks/useSocialPlatforms";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { getChannelIcon, getChannelColor, getChannelDisplayName } from "@/utils/channelHelpers";

interface SocialShareButtonProps {
  type: 'service' | 'event' | 'referral' | 'live_room';
  data: {
    title: string;
    description: string;
    price?: number;
    currency?: string;
    link?: string;
    referralCode?: string;
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
  const [showMoreChannels, setShowMoreChannels] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { allPlatforms, loading } = useSocialPlatforms();
  const navigate = useNavigate();

  // Reset showMoreChannels when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowMoreChannels(false);
    }
  }, [isOpen]);

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

  const handlePlatformClick = (platform: SocialPlatform) => {
    const shareText = getShareText();
    const shareLink = getShareLink();
    
    try {
      if (platform.id === 'messenger') {
        toast({
          title: "Opening Messenger...",
          description: "Share via Vitana Messenger"
        });
        navigate('/messenger');
        setIsOpen(false);
        return;
      }

      if (!platform.connected && platform.supportsDirectShare) {
        // Open native share for unconnected platforms
        const shareUrls: Record<string, string> = {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareText)}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`,
          instagram: `https://www.instagram.com/`,
          email: `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(shareText + '\n\n' + shareLink)}`,
          sms: `sms:?body=${encodeURIComponent(shareText + '\n\n' + shareLink)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareLink)}`,
        };
        
        if (shareUrls[platform.id]) {
          if (platform.id === 'email' || platform.id === 'sms') {
            window.location.href = shareUrls[platform.id];
          } else {
            window.open(shareUrls[platform.id], '_blank', 'width=600,height=400');
          }
          toast({
            title: "Share opened",
            description: `Complete your share on ${platform.name}`,
          });
        } else if (platform.id === 'slack') {
          toast({
            title: "Slack sharing",
            description: "Copy the link and share it in your Slack workspace",
          });
          handleCopyLink();
        }
        return;
      }

      if (!platform.connected) {
        toast({
          title: "Connect account",
          description: `Connect your ${platform.name} account to share content`,
        });
        return;
      }

      // Handle connected platforms (for future automation)
      const handlers: Record<string, () => void> = {
        facebook: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareText)}`, '_blank'),
        twitter: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`, '_blank'),
        linkedin: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`, '_blank'),
        instagram: async () => {
          await navigator.clipboard.writeText(shareLink);
          toast({ title: "Instagram", description: "Link copied! Open Instagram to share" });
        },
        youtube: async () => {
          await navigator.clipboard.writeText(shareLink);
          toast({ title: "YouTube", description: "Link copied! Share on YouTube" });
        },
        tiktok: async () => {
          await navigator.clipboard.writeText(shareLink);
          toast({ title: "TikTok", description: "Link copied! Share on TikTok" });
        },
      };

      handlers[platform.id]?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareText = getShareText();
      const shareLink = getShareLink();
      await navigator.clipboard.writeText(`${shareText}\n\n${shareLink}`);
      toast({
        title: "Copied to Clipboard! 📋",
        description: "Share text and link copied successfully"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleConnectPlatform = () => {
    setIsOpen(false);
    navigate(`/profile/${user?.id}#social-connections`);
  };

  // Build share options with all platforms
  const shareOptions = useMemo(() => {
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

  // Additional communication channels
  const moreChannels = useMemo(() => {
    const channels: SocialPlatform[] = [
      {
        id: "email",
        name: getChannelDisplayName("email"),
        icon: getChannelIcon("email"),
        color: getChannelColor("email"),
        connected: false,
        supportsDirectShare: true,
        supportsAutomation: true,
      },
      {
        id: "sms",
        name: getChannelDisplayName("sms"),
        icon: getChannelIcon("sms"),
        color: getChannelColor("sms"),
        connected: false,
        supportsDirectShare: true,
        supportsAutomation: true,
      },
      {
        id: "whatsapp",
        name: getChannelDisplayName("whatsapp"),
        icon: getChannelIcon("whatsapp"),
        color: getChannelColor("whatsapp"),
        connected: false,
        supportsDirectShare: true,
        supportsAutomation: true,
      },
      {
        id: "slack",
        name: getChannelDisplayName("slack"),
        icon: getChannelIcon("slack"),
        color: getChannelColor("slack"),
        connected: false,
        supportsDirectShare: true,
        supportsAutomation: true,
      },
    ];
    return channels;
  }, []);

  // Combined channels - show first 7 or all based on state
  const displayedOptions = useMemo(() => {
    if (showMoreChannels) {
      return [...shareOptions, ...moreChannels];
    }
    return shareOptions.slice(0, 7); // Show first 7 platforms
  }, [shareOptions, moreChannels, showMoreChannels]);

  return (
    <>
      <Button
        variant={variant === 'icon' ? 'ghost' : 'outline'}
        size={size}
        onClick={() => setIsOpen(true)}
        className={variant === 'icon' ? `p-2 ${className || ''}` : className}
      >
        <Share2 className="w-4 h-4" />
        {variant === 'button' && <span className="ml-2">Share</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
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

            {/* Share Options */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Alert className="bg-muted/50">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Connected:</strong> Share with one click. <strong>Not connected:</strong> Opens share dialog.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {displayedOptions.map((option) => {
                      const Icon = option.icon;
                      const isConnected = option.connected;

                      return (
                        <div key={option.id} className="relative">
                          <Button
                            variant="outline"
                            className={`w-full flex flex-col items-center gap-2 h-auto py-4 ${
                              isConnected 
                                ? "hover:bg-accent hover:border-primary" 
                                : "border-dashed border-muted-foreground/30"
                            }`}
                            onClick={() => handlePlatformClick(option)}
                          >
                            <div className="relative">
                              <Icon className={`h-6 w-6 ${isConnected ? option.color : "text-muted-foreground"}`} />
                              {isConnected && (
                                <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-600 bg-background rounded-full" />
                              )}
                            </div>
                            <span className={`text-xs ${!isConnected && "text-muted-foreground"}`}>
                              {option.name}
                            </span>
                            {isConnected ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                                <ExternalLink className="h-2.5 w-2.5" />
                                Share
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
                    
                    {/* More Channels Card */}
                    {!showMoreChannels && (
                      <button
                        type="button"
                        onClick={() => setShowMoreChannels(true)}
                        className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-3 transition-all hover:border-primary/50 hover:bg-accent/30"
                      >
                        <Plus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          More
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +4 channels
                        </Badge>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Copy Link Action */}
            <div className="pt-2 border-t">
              <Button 
                variant="outline"
                className="w-full"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
