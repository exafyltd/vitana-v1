import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  FileText,
  TrendingUp,
  Radio,
  Clock,
  Sparkles,
  Eye,
  Edit,
  Copy,
  Trash2,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  Mail,
  MessageSquare,
  Music,
  Check,
  ChevronDown,
  ChevronUp,
  Share2,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Campaign } from "@/hooks/useCampaigns";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCampaignActions } from "@/hooks/useCampaignActions";
import { CHANNEL_INFO, DISTRIBUTION_TEMPLATES } from "@/lib/campaign-templates";
import type { LucideIcon } from "lucide-react";
import { DeleteCampaignDialog } from "./DeleteCampaignDialog";
import { CampaignAnalyticsExpanded } from "./CampaignAnalyticsExpanded";
import { ShareCampaignModal } from "./ShareCampaignModal";
import { ActivateCampaignDialog } from "./ActivateCampaignDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface CampaignCardProps {
  campaign: Campaign;
  stats: {
    total: number;
    published: number;
    drafts: number;
  };
  onClick?: () => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function getStatusAccentBar(status: string): string {
  const bars = {
    active: "border-l-4 border-l-green-500",
    draft: "border-l-4 border-l-amber-500",
    paused: "border-l-4 border-l-yellow-500",
    completed: "border-l-4 border-l-purple-500",
  };
  return bars[status as keyof typeof bars] || bars.draft;
}

function getStatusBorderGradient(status: string): string {
  const gradients: Record<string, string> = {
    draft: "border-transparent bg-gradient-to-br from-amber-100/50 via-orange-50/30 to-amber-100/50",
    active: "border-transparent bg-gradient-to-br from-teal-100/50 via-cyan-50/30 to-teal-100/50",
    smart: "border-transparent bg-gradient-to-br from-teal-100/50 via-cyan-50/30 to-teal-100/50",
    completed: "border-transparent bg-gradient-to-br from-purple-100/50 via-pink-50/30 to-purple-100/50",
    paused: "border-transparent bg-gradient-to-br from-yellow-100/50 via-amber-50/30 to-yellow-100/50",
  };
  return gradients[status] || gradients.draft;
}

function getStatusPillStyle(status: string): string {
  const styles: Record<string, string> = {
    draft: "bg-amber-100/80 text-amber-700 border-amber-300 backdrop-blur-sm",
    active: "bg-green-100/80 text-green-700 border-green-300 backdrop-blur-sm",
    paused: "bg-yellow-100/80 text-yellow-700 border-yellow-300 backdrop-blur-sm",
    completed:
      "bg-purple-100/80 text-purple-700 border-purple-300 backdrop-blur-sm",
  };
  return styles[status] || styles.draft;
}

function getTemplateBadgeStyle(templateId: string): string {
  const styles: Record<string, string> = {
    launch:
      "bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-300",
    nurture:
      "bg-gradient-to-r from-green-100 to-teal-100 text-green-700 border-green-300",
    event:
      "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-300",
    professional:
      "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-300",
    custom:
      "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-300",
  };
  return styles[templateId] || styles.custom;
}

function getChannelIcon(channelKey: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    instagram: Instagram,
    linkedin: Linkedin,
    twitter: Twitter,
    facebook: Facebook,
    youtube: Youtube,
    tiktok: Music,
    email: Mail,
    sms: MessageSquare,
  };
  return icons[channelKey] || Mail;
}

export function CampaignCard({ 
  campaign, 
  stats, 
  onClick,
  bulkMode = false,
  isSelected = false,
  onToggleSelect,
}: CampaignCardProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { duplicateCampaign, deleteCampaign, activateCampaign, updateCampaign } = useCampaigns();
  const { activateAllPosts } = useCampaignActions();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  // Parse campaign data
  const selectedChannels = Object.entries(
    (campaign.target_channels as Record<string, boolean>) || {}
  )
    .filter(([_, selected]) => selected)
    .map(([key]) => key);

  // Check if campaign can be activated (must be after selectedChannels)
  const canActivate = campaign.status === "draft" && 
    campaign.name && 
    selectedChannels.length > 0;

  const templateId =
    (campaign.distribution_config as any)?.template_id || "custom";
  const template = DISTRIBUTION_TEMPLATES.find((t) => t.id === templateId);
  const smartSchedulingEnabled = (campaign.distribution_config as any)
    ?.smart_scheduling_enabled;
  const frequency =
    template?.frequency ||
    (campaign.distribution_config as any)?.frequency ||
    "Custom";
  const bestTimes = (campaign.distribution_config as any)?.best_times;
  const hasBestTimes = bestTimes && Object.keys(bestTimes).length > 0;

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await duplicateCampaign.mutateAsync(campaign.id);
    if (result && onClick) {
      onClick();
    }
  };

  const handleDelete = () => {
    const skipConfirm = localStorage.getItem("vitana_skip_draft_delete_confirm");
    
    if (campaign.status === "draft" && skipConfirm === "true") {
      deleteCampaign.mutate(campaign.id);
    } else {
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = () => {
    deleteCampaign.mutate(campaign.id);
  };

  const handleActivateCampaign = async (mode: "instant" | "scheduled", scheduledTime?: Date) => {
    try {
      if (mode === "scheduled" && scheduledTime) {
        await updateCampaign.mutateAsync({
          id: campaign.id,
          status: "scheduled",
          start_date: scheduledTime.toISOString(),
        });
      } else {
        await activateCampaign.mutateAsync(campaign.id);
        // Also activate all draft posts
        try {
          await activateAllPosts.mutateAsync(campaign.id);
        } catch {
          // No draft posts to activate is fine
        }
      }
      setShowActivateDialog(false);
    } catch (error) {
      console.error('Activation failed:', error);
    }
  };

  return (
    <>
      <Card
      className={cn(
        // Base styling
        "group relative overflow-visible cursor-pointer",
        "p-5 max-md:p-4 rounded-2xl border-2",
        // Frosted glass background
        "bg-white/85 backdrop-blur-xl",
        // Dynamic gradient border
        getStatusBorderGradient(campaign.status),
        // Inner glow
        "shadow-[0_0_12px_rgba(0,0,0,0.05)] shadow-xl",
        // Hover effects
        "hover:scale-[1.01] hover:shadow-2xl",
        "transition-all duration-300 ease-out",
        // Status accent bar
        getStatusAccentBar(campaign.status)
      )}
      onClick={onClick}
    >
      {/* Bulk Selection Checkbox */}
      {bulkMode && (
        <div className={cn(
          "absolute top-3 left-3 z-10",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          isSelected && "opacity-100"
        )}>
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center",
              "bg-white/90 backdrop-blur-sm border-2 border-gray-300",
              "hover:border-teal-500 transition-all cursor-pointer",
              isSelected && "bg-teal-100 border-teal-500"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            {isSelected && (
              <Check className="w-4 h-4 text-teal-600" />
            )}
          </div>
        </div>
      )}

      {/* Header Zone */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <h3
          className={cn(
            "text-lg max-md:text-base font-semibold leading-tight tracking-tight flex-1",
            "text-gray-900",
            "group-hover:bg-gradient-to-r group-hover:from-gradient-join-start group-hover:to-gradient-join-end",
            "group-hover:bg-clip-text group-hover:text-transparent",
            "transition-all duration-200"
          )}
        >
          {campaign.name}
        </h3>

        {/* Status Pills */}
        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium capitalize rounded-full",
                    getStatusPillStyle(campaign.status)
                  )}
                >
                  {campaign.status}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {campaign.status === 'draft' ? 'Not yet published' : 
                   campaign.status === 'active' ? 'Currently publishing' :
                   campaign.status === 'completed' ? 'Campaign completed' :
                   'Campaign paused'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {smartSchedulingEnabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium gap-1 rounded-full",
                      "bg-gradient-to-r from-teal-400/20 to-green-400/20",
                      "border-teal-300 text-teal-700",
                      "hover:shadow-lg hover:shadow-teal-200/50",
                      "transition-all duration-300"
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    {t('screens.sharing.smart')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t('screens.sharing.aiSchedulingActive')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Description Zone */}
      {campaign.description && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative mb-5">
                <p className="text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
                  {campaign.description}
                </p>
                {/* Fade mask after 2 lines */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/85 to-transparent pointer-events-none" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{campaign.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Campaign Type Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {template && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 gap-2",
                    getTemplateBadgeStyle(template.id)
                  )}
                >
                  <span className="text-base">{template.icon}</span>
                  {template.name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('screens.sharing.basedYourCampaignTemplate')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Badge variant="secondary" className="text-xs px-2.5 py-1">
          📊 {frequency}
        </Badge>
      </div>

      {/* Publishing To (Channels) */}
      {selectedChannels.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[11px] font-medium uppercase tracking-[0.5px] text-gray-500/80 mb-2">
            {t('screens.sharing.publishing')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedChannels.slice(0, 4).map((channelKey) => {
              const channelInfo = CHANNEL_INFO[channelKey];
              const Icon = getChannelIcon(channelKey);

              return channelInfo ? (
                <TooltipProvider key={channelKey}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "ring-2 ring-white shadow-md",
                      "transition-all duration-200",
                      "hover:scale-110 hover:shadow-lg",
                      "hover:shadow-[0_0_16px_rgba(0,0,0,0.15)]",
                      channelInfo.color
                    )}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{t('screens.sharing.nameConnected', { name: channelInfo.name })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null;
            })}

            {selectedChannels.length > 4 && (
              <Badge
                variant="secondary"
                className="text-xs font-medium px-2 py-0.5 rounded-full"
              >
                +{selectedChannels.length - 4}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Scheduled Sweet Spots */}
      {hasBestTimes && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-gray-500/70" />
            <h4 className="text-[11px] font-medium uppercase tracking-[0.5px] text-gray-500/80">
              {t('screens.sharing.scheduledSweetSpots')}
            </h4>
          </div>
          <p className="text-[10px] text-gray-500/70 mb-2 ml-5">
            {t('screens.sharing.airecommendedPostingTimes')}
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1.5">
                  {Object.entries(bestTimes)
                    .slice(0, showAllSchedules ? Object.keys(bestTimes).length : 3)
                    .map(([channel, times], index) => {
                      const channelInfo = CHANNEL_INFO[channel];
                      const timeArray = times as string[];
                      const Icon = getChannelIcon(channel);

                      return channelInfo && timeArray?.length > 0 ? (
                        <div key={channel}>
                          <div
                            className={cn(
                              "flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg",
                              "bg-gradient-to-r from-blue-50 to-purple-50",
                              "border border-blue-100",
                              "transition-all duration-200",
                              "hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50",
                              "hover:border-teal-200 hover:shadow-md"
                            )}
                          >
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center opacity-90",
                                channelInfo.color
                              )}
                            >
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                            <Clock className="w-3 h-3 text-gray-600" />
                            <span className="font-medium text-gray-700">
                              {channelInfo.name}:
                            </span>
                            <span className="text-gray-600">
                              {timeArray.slice(0, 2).join(", ")}
                            </span>
                          </div>

                          {/* Divider between rows */}
                          {index <
                            Math.min(Object.keys(bestTimes).length, 3) - 1 && (
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-1" />
                          )}
                        </div>
                      ) : null;
                    })}

                  {Object.keys(bestTimes).length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllSchedules(!showAllSchedules);
                      }}
                      className={cn(
                        "text-xs font-medium ml-2 px-2 py-1 rounded-md",
                        "text-teal-600 hover:text-teal-700",
                        "hover:bg-teal-50 transition-all duration-200",
                        "flex items-center gap-1"
                      )}
                    >
                      {showAllSchedules ? (
                        <>
                          <ChevronUp className="w-3 h-3" />{t('screens.sharing.showLess')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />{t('screens.sharing.value0MoreChannelValue1', { value0: Object.keys(bestTimes).length - 3, value1: Object.keys(bestTimes).length - 3 !== 1 ? "s" : "" })}</>
                      )}
                    </button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('screens.sharing.aisuggestedBestTimes')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Date Range */}
      {(campaign.start_date || campaign.end_date) && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 px-2 py-1.5 bg-gray-50 rounded-lg">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {campaign.start_date &&
              formatDate(new Date(campaign.start_date), "MMM d, yyyy")}
            {campaign.start_date && campaign.end_date && " → "}
            {campaign.end_date &&
              formatDate(new Date(campaign.end_date), "MMM d, yyyy")}
          </span>
        </div>
      )}

      {/* Footer Analytics Bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 pt-4 mt-4",
          "border-t border-teal-100/10"
        )}
      >
        {/* Posts */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <div className="flex flex-col">
                  <span className="text-base font-bold text-gray-900 leading-none">
                    {stats.total}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">
                    {t('screens.sharing.posts')}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('screens.sharing.totalPreparedPosts')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Live */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Radio className="w-3.5 h-3.5 text-green-600" />
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-green-600 leading-none">
                    {stats.published}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">
                    {t('screens.sharing.live')}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('screens.sharing.currentlyActivePosts')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Reach */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-base font-bold text-blue-600 leading-none">
                    2.4K
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">
                    {t('screens.sharing.reach')}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('screens.sharing.estimatedAudienceReach')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Quick Actions Overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-3",
          "bg-gradient-to-t from-white/95 via-white/90 to-transparent backdrop-blur-sm",
          "opacity-0 group-hover:opacity-100",
          "translate-y-2 group-hover:translate-y-0",
          "transition-all duration-300 ease-out",
          "rounded-b-2xl pointer-events-none group-hover:pointer-events-auto",
          "max-md:gap-1"
        )}
      >
        <div className="flex items-center justify-end gap-2">
          {/* Activate button - only for draft campaigns */}
          {canActivate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-teal-100 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActivateDialog(true);
                    }}
                  >
                    <Rocket className="w-3.5 h-3.5 text-teal-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t('screens.sharing.activateCampaign')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-blue-100 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAnalytics(!showAnalytics);
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{showAnalytics ? "Hide Analytics" : "View Analytics"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-green-100 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                  }}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('screens.sharing.edit')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-teal-100 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareModal(true);
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{translate('common.share', 'Share')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-purple-100 shadow-sm"
                  onClick={handleDuplicate}
                  disabled={duplicateCampaign.isPending}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {duplicateCampaign.isPending ? "Duplicating..." : "Duplicate"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-red-100 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('screens.sharing.delete')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>

    {/* Delete Confirmation Dialog */}
    <DeleteCampaignDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      onConfirm={confirmDelete}
      campaignName={campaign.name}
      isDraft={campaign.status === "draft"}
    />

    {/* Expanded Analytics View */}
    {showAnalytics && (
      <CampaignAnalyticsExpanded
        campaign={campaign}
        stats={stats}
        onClose={() => setShowAnalytics(false)}
      />
    )}

    {/* Share Modal */}
    <ShareCampaignModal
      open={showShareModal}
      onOpenChange={setShowShareModal}
      campaignId={campaign.id}
      campaignName={campaign.name}
      campaignDescription={campaign.description || undefined}
      campaignImage={campaign.cover_image_url || undefined}
    />

    {/* Activate Campaign Dialog */}
    <ActivateCampaignDialog
      open={showActivateDialog}
      onOpenChange={setShowActivateDialog}
      onConfirm={handleActivateCampaign}
      isLoading={activateCampaign.isPending || activateAllPosts.isPending}
      postsCount={stats.total}
      draftCount={stats.drafts}
      campaignId={campaign.id}
      campaignData={{
        channels: selectedChannels,
      }}
      targetChannels={(campaign.target_channels as Record<string, boolean>) || null}
    />
  </>
  );
}
