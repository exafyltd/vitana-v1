import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Send,
  Sparkles,
  Copy,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShareChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  connected: boolean;
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
  const [message, setMessage] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  // Mock connected channels - in real app, fetch from user's connected accounts
  const channels: ShareChannel[] = [
    { id: "facebook", name: "Facebook", icon: Facebook, connected: true },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, connected: true },
    { id: "twitter", name: "X (Twitter)", icon: Twitter, connected: false },
    { id: "instagram", name: "Instagram", icon: Instagram, connected: true },
    { id: "youtube", name: "YouTube", icon: Youtube, connected: false },
    { id: "email", name: "Email", icon: Mail, connected: true },
  ];

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleBlastNow = async () => {
    if (selectedChannels.length === 0) {
      toast({
        title: "No channels selected",
        description: "Please select at least one channel to share",
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
          target_channels: selectedChannels.reduce((acc, channel) => ({
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
        description: `Your ${content.type} is being shared across ${selectedChannels.length} channel(s)`,
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
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard",
    });
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
            <Label>Select Channels</Label>
            <div className="grid grid-cols-2 gap-3">
              {channels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <div
                    key={channel.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      channel.connected
                        ? "cursor-pointer hover:bg-accent"
                        : "cursor-not-allowed opacity-50"
                    } ${
                      selectedChannels.includes(channel.id)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() =>
                      channel.connected && handleChannelToggle(channel.id)
                    }
                  >
                    <Checkbox
                      checked={selectedChannels.includes(channel.id)}
                      disabled={!channel.connected}
                      onCheckedChange={() => handleChannelToggle(channel.id)}
                    />
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{channel.name}</span>
                    {!channel.connected && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Not connected
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              size="lg"
              onClick={handleBlastNow}
              disabled={isSharing || selectedChannels.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSharing ? "Sharing..." : "Blast Now"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleCreateCampaign}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
            <Button variant="ghost" size="lg" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
