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
  Loader2,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Video,
} from "lucide-react";
import { useDistributionPosts } from "@/hooks/useDistributionPosts";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleDialog } from "./ScheduleDialog";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

// Static channel definitions - no database setup required
const STATIC_CHANNELS = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "twitter", label: "Twitter/X", icon: Twitter },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "tiktok", label: "TikTok", icon: Video },
] as const;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  campaignTargetChannels?: Record<string, boolean> | null;
  onPostCreated?: () => void;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  campaignTargetChannels,
  onPostCreated,
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // Pre-select channels from campaign when dialog opens
  useEffect(() => {
    if (open && campaignTargetChannels) {
      const preselected = new Set<string>();
      Object.entries(campaignTargetChannels).forEach(([key, enabled]) => {
        if (enabled) {
          preselected.add(key);
        }
      });
      setSelectedChannels(preselected);
    }
  }, [open, campaignTargetChannels]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedChannels(new Set());
    setEntityType("event");
  };

  const toggleChannel = (channelKey: string) => {
    setSelectedChannels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(channelKey)) {
        newSet.delete(channelKey);
      } else {
        newSet.add(channelKey);
      }
      return newSet;
    });
  };

  const validateForm = () => {
    if (!userId) {
      notifyError('toasts.sharing.pleaseLogCreatePosts');
      return false;
    }
    if (!title || !description) {
      notifyError('toasts.sharing.pleaseFillTitleDescription');
      return false;
    }
    if (selectedChannels.size === 0) {
      notifyError('toasts.sharing.pleaseSelectAtLeastOneChannel2');
      return false;
    }
    return true;
  };

  const getChannelTypes = () => {
    return Array.from(selectedChannels) as Database["public"]["Enums"]["channel_type"][];
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
          onPostCreated?.();
        },
      }
    );
  };

  const handleSaveDraft = async () => {
    if (!userId) {
      notifyError('toasts.sharing.pleaseLogSaveDrafts');
      return;
    }
    if (!title || !description) {
      notifyError('toasts.sharing.pleaseFillTitleDescription');
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
          notifySuccess('toasts.sharing.postSavedAsDraft');
          resetForm();
          onOpenChange(false);
          onPostCreated?.();
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
          notifySuccess('toasts.sharing.postScheduledSuccessfully');
          resetForm();
          setPendingPostId(null);
          setShowScheduleDialog(false);
          onOpenChange(false);
          onPostCreated?.();
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

            {/* Content Editor */}
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
                rows={3}
              />
            </div>

            {/* Static Channel Selector */}
            <div className="space-y-2">
              <Label>{t('screens.sharing.selectChannels')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {STATIC_CHANNELS.map((channel) => {
                  const isSelected = selectedChannels.has(channel.key);
                  const IconComponent = channel.icon;

                  return (
                    <button
                      key={channel.key}
                      type="button"
                      onClick={() => toggleChannel(channel.key)}
                      className={`
                        flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left
                        ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card hover:bg-accent border-border"
                        }
                      `}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium truncate">
                        {channel.label}
                      </span>
                    </button>
                  );
                })}
              </div>
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
              title={t('screens.sharing.saveAsDraft')}
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
