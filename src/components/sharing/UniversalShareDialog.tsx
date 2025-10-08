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
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocialPlatforms, SocialPlatform } from "@/hooks/useSocialPlatforms";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { useAuth } from "@/context/AuthProvider";

interface ShareChannel extends SocialPlatform {
  isVitanaMessenger?: boolean;
}

interface ShareableContent {
  type: "group" | "event" | "meetup" | "live_room" | "profile" | "post" | "service";
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  url?: string;
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
  const [linkCopied, setLinkCopied] = useState(false);

  // Build channels array with all platforms + Vitana Messenger
  const channels: ShareChannel[] = useMemo(() => {
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

    return [vitanaMessenger, ...allPlatforms];
  }, [allPlatforms]);

  const handleChannelClick = (channel: ShareChannel) => {
    if (channel.connected) {
      // Toggle selection for automated blast
      setSelectedChannels((prev) =>
        prev.includes(channel.id)
          ? prev.filter((id) => id !== channel.id)
          : [...prev, channel.id]
      );
    } else if (channel.supportsDirectShare) {
      // Open native share dialog for unconnected platforms
      openNativeShare(channel.id);
    } else {
      // Show connect prompt for platforms without direct share
      toast({
        title: "Connect account",
        description: `Connect your ${channel.name} account to share content`,
      });
    }
  };

  const openNativeShare = (platformId: string) => {
    const shareUrl = content.url || `${window.location.origin}/${content.type}/${content.id}`;
    const shareText = `${content.title}${content.description ? '\n' + content.description : ''}`;
    
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      instagram: `https://www.instagram.com/`, // Instagram doesn't support direct web sharing
    };
    
    if (shareUrls[platformId]) {
      window.open(shareUrls[platformId], '_blank', 'width=600,height=400');
      analytics.trackShare('share_completed', 'universal', content.id, content.type);
      toast({
        title: "Share opened",
        description: `Complete your share on ${platformId}`,
      });
    }
  };

  const handleConnectPlatform = (platformId: string) => {
    onOpenChange(false);
    navigate(`/profile/${user?.id}#social-connections`);
  };

  const handleBlastNow = async () => {
    // Filter out vitana_messenger - it's internal only
    const distributionChannels = selectedChannels.filter(
      (id) => id !== "vitana_messenger"
    );

    if (distributionChannels.length === 0) {
      toast({
        title: "Select distribution channels",
        description: "Please select at least one channel for distribution",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create a quick campaign for immediate distribution
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

      toast({
        title: "🚀 Blast Successful!",
        description: `Your ${content.type} is being shared across ${distributionChannels.length} channel(s)`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Share failed",
        description: "Failed to share content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreateCampaign = () => {
    // Navigate to campaigns page with pre-filled data
    window.location.href = `/sharing/campaigns?prefill=${encodeURIComponent(
      JSON.stringify({
        name: `Campaign - ${content.title}`,
        description: message,
        content_type: content.type,
        content_id: content.id,
      })
    )}`;
  };

  const handleCopyLink = () => {
    const shareUrl = content.url || `${window.location.origin}/${content.type}/${content.id}`;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Share {content.type}
          </DialogTitle>
          <DialogDescription>
            Distribute across your connected channels or create a campaign
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

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Share Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a custom message to your share..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Channel Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="channels" className="text-base font-semibold">
                Share Channels
              </Label>
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
                    <strong>Connected:</strong> Select for automated blast. <strong>Not connected:</strong> Click to share manually.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {channels.map((channel) => {
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
                          {isConnected ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Connected
                            </Badge>
                          ) : channel.supportsDirectShare ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                              <ExternalLink className="h-2.5 w-2.5" />
                              Share
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                              <Link2 className="h-2.5 w-2.5" />
                              Connect
                            </Badge>
                          )}
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
              onClick={handleCopyLink}
            >
              {linkCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
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
