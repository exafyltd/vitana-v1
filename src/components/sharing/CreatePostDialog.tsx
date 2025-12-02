import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useDistributionPosts } from "@/hooks/useDistributionPosts";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { useChannels } from "@/hooks/useChannels";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleDialog } from "./ScheduleDialog";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  push: MessageSquare,
  slack: MessageSquare,
  discord: MessageSquare,
  telegram: MessageSquare,
};

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: CreatePostDialogProps) {
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [entityType, setEntityType] = useState<string>("event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);

  const { createPost, blastNow } = useDistributionPosts();
  const { schedulePost } = useScheduledPosts();
  const { channels, isLoading: channelsLoading } = useChannels();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedChannels(new Set());
    setEntityType("event");
  };

  const toggleChannel = (channelId: string) => {
    const channel = channels?.find((c) => c.id === channelId);
    if (!channel?.is_connected) {
      toast.error("Please connect this channel first.");
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

  const validateForm = () => {
    if (!userId) {
      toast.error("Please log in to create posts.");
      return false;
    }
    if (!title || !description) {
      toast.error("Please fill in title and description.");
      return false;
    }
    if (selectedChannels.size === 0) {
      toast.error("Please select at least one channel.");
      return false;
    }
    return true;
  };

  const getChannelTypes = () => {
    return Array.from(selectedChannels)
      .map((id) => channels?.find((c) => c.id === id)?.channel_type)
      .filter(Boolean) as Database["public"]["Enums"]["channel_type"][];
  };

  const handleBlastNow = async () => {
    if (!validateForm()) return;

    createPost.mutate(
      {
        user_id: userId!,
        title,
        content: description,
        description,
        entity_type: entityType,
        channels: getChannelTypes(),
        status: "draft",
        campaign_id: campaignId,
      },
      {
        onSuccess: (post) => {
          blastNow.mutate(post.id);
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  const handleSaveDraft = async () => {
    if (!userId) {
      toast.error("Please log in to save drafts.");
      return;
    }
    if (!title || !description) {
      toast.error("Please fill in title and description.");
      return;
    }

    createPost.mutate(
      {
        user_id: userId,
        title,
        content: description,
        description,
        entity_type: entityType,
        channels: getChannelTypes(),
        status: "draft",
        campaign_id: campaignId,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  const handleScheduleClick = async () => {
    if (!validateForm()) return;

    createPost.mutate(
      {
        user_id: userId!,
        title,
        content: description,
        description,
        entity_type: entityType,
        channels: getChannelTypes(),
        status: "draft",
        campaign_id: campaignId,
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

    schedulePost.mutate(
      {
        post_id: pendingPostId,
        user_id: userId,
        scheduled_for: scheduledFor.toISOString(),
        channels: getChannelTypes(),
      },
      {
        onSuccess: () => {
          resetForm();
          setPendingPostId(null);
          setShowScheduleDialog(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Create Post
            </DialogTitle>
            <DialogDescription>
              Create a new post for campaign: <span className="font-medium">{campaignName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Entity Type Selector */}
            <div className="space-y-2">
              <Label>What are you sharing?</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="live-room">Live Room</SelectItem>
                  <SelectItem value="profile">Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Enter a compelling title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Write your message..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Channel Selector */}
            <div className="space-y-2">
              <Label>Select Channels</Label>
              {channelsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
                          flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left
                          ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : isConnected
                              ? "bg-card hover:bg-accent border-border"
                              : "bg-muted/50 opacity-60 border-border"
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium flex-1 truncate">
                          {channel.channel_name}
                        </span>
                        {isConnected ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 border rounded-lg bg-muted/50">
                  <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm text-muted-foreground">No channels connected</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              onClick={handleBlastNow}
              className="flex-1"
              disabled={createPost.isPending || blastNow.isPending}
            >
              {createPost.isPending || blastNow.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Blast Now
            </Button>
            <Button
              variant="outline"
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
              size="icon"
              onClick={handleSaveDraft}
              disabled={createPost.isPending}
              title="Save as draft"
            >
              {createPost.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onConfirm={handleScheduleConfirm}
        isLoading={schedulePost.isPending}
      />
    </>
  );
}
