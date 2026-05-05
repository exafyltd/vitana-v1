import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Calendar as CalendarIcon,
  Save,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Coins,
  Loader2,
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useDistributionPosts } from "@/hooks/useDistributionPosts";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { useChannels, type DistributionChannel } from "@/hooks/useChannels";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleDialog } from "./ScheduleDialog";
import { notifyError, t } from '@/lib/i18n-toast';

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  push: MessageSquare,
  slack: MessageSquare,
  discord: MessageSquare,
  telegram: MessageSquare,
};

export function BlastCenter() {
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [entityType, setEntityType] = useState<string>("event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { createPost, blastNow } = useDistributionPosts();
  const { schedulePost } = useScheduledPosts();
  const { channels, isLoading: channelsLoading } = useChannels();
  const { campaigns } = useCampaigns();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  const toggleChannel = (channelId: string) => {
    const channel = channels?.find((c) => c.id === channelId);
    if (!channel?.is_connected) {
      notifyError('toasts.sharing.channelNotConnected');
      return;
    }

    setSelectedChannels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  const handleBlastNow = async () => {
    if (!userId) {
      notifyError('toasts.sharing.notAuthenticated', 'toasts.sharing.pleaseLogBlastPosts');
      return;
    }

    if (!title || !description) {
      notifyError('toasts.sharing.missingFields', 'toasts.sharing.pleaseFillTitleDescription');
      return;
    }

    if (selectedChannels.size === 0) {
      notifyError('toasts.sharing.noChannelsSelected', 'toasts.sharing.pleaseSelectAtLeastOneChannel');
      return;
    }

    const channelTypes = Array.from(selectedChannels)
      .map(id => channels?.find(c => c.id === id)?.channel_type)
      .filter(Boolean) as Database["public"]["Enums"]["channel_type"][];

    createPost.mutate(
      {
        user_id: userId,
        title,
        content: description,
        description,
        entity_type: entityType,
        channels: channelTypes,
        status: "draft",
        campaign_id: selectedCampaign || null,
      },
      {
        onSuccess: (post) => {
          blastNow.mutate(post.id);
          setTitle("");
          setDescription("");
          setSelectedChannels(new Set());
          setSelectedCampaign("");
        },
      }
    );
  };

  const handleSaveDraft = async () => {
    if (!userId) {
      notifyError('toasts.sharing.notAuthenticated', 'toasts.sharing.pleaseLogSaveDrafts');
      return;
    }

    if (!title || !description) {
      notifyError('toasts.sharing.missingFields', 'toasts.sharing.pleaseFillTitleDescription');
      return;
    }

    const channelTypes = Array.from(selectedChannels)
      .map(id => channels?.find(c => c.id === id)?.channel_type)
      .filter(Boolean) as Database["public"]["Enums"]["channel_type"][];

    createPost.mutate({
      user_id: userId,
      title,
      content: description,
      description,
      entity_type: entityType,
      channels: channelTypes,
      status: "draft",
      campaign_id: selectedCampaign || null,
    });
  };

  const handleScheduleClick = async () => {
    if (!userId) {
      notifyError('toasts.sharing.notAuthenticated', 'toasts.sharing.pleaseLogSchedulePosts');
      return;
    }

    if (!title || !description) {
      notifyError('toasts.sharing.missingFields', 'toasts.sharing.pleaseFillTitleDescription');
      return;
    }

    if (selectedChannels.size === 0) {
      notifyError('toasts.sharing.noChannelsSelected', 'toasts.sharing.pleaseSelectAtLeastOneChannel2');
      return;
    }

    const channelTypes = Array.from(selectedChannels)
      .map(id => channels?.find(c => c.id === id)?.channel_type)
      .filter(Boolean) as Database["public"]["Enums"]["channel_type"][];

    createPost.mutate(
      {
        user_id: userId,
        title,
        content: description,
        description,
        entity_type: entityType,
        channels: channelTypes,
        status: "draft",
        campaign_id: selectedCampaign || null,
      },
      {
        onSuccess: (post) => {
          setPendingPostId(post.id);
          setShowScheduleDialog(true);
        },
      }
    );
  };

  const handleScheduleConfirm = async (scheduledFor: Date) => {
    if (!pendingPostId || !userId) return;

    const channelTypes = Array.from(selectedChannels)
      .map(id => channels?.find(c => c.id === id)?.channel_type)
      .filter(Boolean) as Database["public"]["Enums"]["channel_type"][];

    schedulePost.mutate(
      {
        post_id: pendingPostId,
        user_id: userId,
        scheduled_for: scheduledFor.toISOString(),
        channels: channelTypes,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setSelectedChannels(new Set());
          setSelectedCampaign("");
          setPendingPostId(null);
          setShowScheduleDialog(false);
        },
      }
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Blast Center
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share your content across multiple channels instantly
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entity Type Selector */}
        <div className="space-y-2">
          <Label>{t('screens.sharing.whatYouSharing')}</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="meetup">Meetup</SelectItem>
              <SelectItem value="group">Group</SelectItem>
              <SelectItem value="live-room">{t('screens.sharing.liveRoom')}</SelectItem>
              <SelectItem value="profile">Profile</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaign Selector */}
        <div className="space-y-2">
          <Label>{t('screens.sharing.campaignOptional')}</Label>
          <Select value={selectedCampaign || undefined} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder={t('screens.sharing.noCampaignSelected')} />
            </SelectTrigger>
            <SelectContent>
              {campaigns?.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Campaign Hints */}
          {selectedCampaign && campaigns && (() => {
            const campaign = campaigns.find(c => c.id === selectedCampaign);
            if (!campaign) return null;
            
            const distributionConfig = campaign.distribution_config as any;
            const targetChannels = campaign.target_channels as Record<string, boolean>;
            const selectedChannelKeys = Object.entries(targetChannels || {})
              .filter(([_, selected]) => selected)
              .map(([key]) => key);
            
            return (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                <p className="text-sm font-medium">📊 Campaign: {campaign.name}</p>
                {distributionConfig?.frequency && (
                  <p className="text-xs text-muted-foreground">
                    Frequency: {distributionConfig.frequency}
                  </p>
                )}
                {distributionConfig?.smart_scheduling_enabled && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>✨</span> Smart scheduling enabled
                  </p>
                )}
                {selectedChannelKeys.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Channels: {selectedChannelKeys.join(", ")}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Content Editor */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder={t('screens.sharing.enterCompellingTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder={t('screens.sharing.writeYourMessage')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Channel Selector */}
        <div className="space-y-3">
          <Label>{t('screens.sharing.selectChannels')}</Label>
          {channelsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : channels && channels.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {channels.map((channel) => {
                const Icon = CHANNEL_ICONS[channel.channel_type] || MessageSquare;
                const isSelected = selectedChannels.has(channel.id);
                const isConnected = channel.is_connected && channel.is_active;

                return (
                  <button
                    key={channel.id}
                    onClick={() => toggleChannel(channel.id)}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg border transition-all
                      ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : isConnected
                          ? "bg-card hover:bg-accent"
                          : "bg-muted/50 opacity-60"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium flex-1 text-left">{channel.channel_name}</span>
                    {isConnected ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg bg-muted/50">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('screens.sharing.noChannelsConnectedYet')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Go to Integrations to connect channels
              </p>
            </div>
          )}
        </div>

        {/* Earn Credits Badge */}
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Coins className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800 dark:text-green-200">
            Post now, earn +5 credits
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button 
            onClick={handleBlastNow} 
            className="flex-1" 
            size="lg"
            disabled={createPost.isPending || blastNow.isPending}
          >
            {(createPost.isPending || blastNow.isPending) ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Blast Now
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={handleScheduleClick}
            disabled={createPost.isPending}
          >
            {createPost.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CalendarIcon className="w-4 h-4 mr-2" />
            )}
            Schedule
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={handleSaveDraft}
            disabled={createPost.isPending}
          >
            {createPost.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>

      <ScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onConfirm={handleScheduleConfirm}
        isLoading={schedulePost.isPending}
      />
    </Card>
  );
}
