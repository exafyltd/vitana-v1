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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { Campaign } from "@/hooks/useCampaigns";
import { CHANNEL_INFO, DISTRIBUTION_TEMPLATES } from "@/lib/campaign-templates";
import type { LucideIcon } from "lucide-react";

interface CampaignCardProps {
  campaign: Campaign;
  stats: {
    total: number;
    published: number;
    drafts: number;
  };
  onClick?: () => void;
}

function getStatusAccentBar(status: string): string {
  const bars: Record<string, string> = {
    active: "border-l-4 border-green-500",
    draft: "border-l-4 border-amber-500",
    paused: "border-l-4 border-yellow-500",
    completed: "border-l-4 border-purple-500",
  };
  return bars[status] || bars.draft;
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

export function CampaignCard({ campaign, stats, onClick }: CampaignCardProps) {
  const navigate = useNavigate();

  // Parse campaign data
  const selectedChannels = Object.entries(
    (campaign.target_channels as Record<string, boolean>) || {}
  )
    .filter(([_, selected]) => selected)
    .map(([key]) => key);

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

  return (
    <Card
      className={cn(
        // Base styling
        "group relative overflow-visible cursor-pointer",
        "p-5 rounded-2xl border-2",
        // Frosted glass background
        "bg-white/85 backdrop-blur-xl",
        // Gradient border effect
        "bg-gradient-to-br from-white to-gray-50",
        "shadow-xl shadow-purple-100/50",
        // Hover effects
        "hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-200/60",
        "transition-all duration-300 ease-out",
        // Status accent bar
        getStatusAccentBar(campaign.status)
      )}
      onClick={onClick}
    >
      {/* Header Zone */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3
          className={cn(
            "text-lg font-bold text-gray-900 leading-tight flex-1",
            "group-hover:text-primary transition-colors duration-200"
          )}
        >
          {campaign.name}
        </h3>

        {/* Status Pills */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            className={cn(
              "text-xs font-semibold capitalize px-3 py-1",
              getStatusPillStyle(campaign.status)
            )}
          >
            {campaign.status}
          </Badge>

          {smartSchedulingEnabled && (
            <Badge
              className={cn(
                "text-xs font-semibold px-3 py-1 gap-1.5",
                "bg-gradient-to-r from-teal-400/20 to-green-400/20",
                "border-teal-300 text-teal-700",
                "group-hover:animate-shimmer"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Smart
            </Badge>
          )}
        </div>
      </div>

      {/* Description Zone */}
      {campaign.description && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                {campaign.description}
              </p>
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
                <p className="text-xs">Based on your campaign template</p>
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
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Publishing To
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
                          "transition-transform hover:scale-110",
                          channelInfo.color
                        )}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{channelInfo.name} • Connected</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null;
            })}

            {selectedChannels.length > 4 && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-700 text-xs font-semibold ring-2 ring-white shadow-md">
                +{selectedChannels.length - 4}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scheduled Sweet Spots */}
      {hasBestTimes && (
        <div className="mb-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Scheduled Sweet Spots
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1.5">
                  {Object.entries(bestTimes)
                    .slice(0, 3)
                    .map(([channel, times]) => {
                      const channelInfo = CHANNEL_INFO[channel];
                      const timeArray = times as string[];
                      const Icon = getChannelIcon(channel);

                      return channelInfo && timeArray?.length > 0 ? (
                        <div
                          key={channel}
                          className="flex items-center gap-2 text-xs bg-gradient-to-r from-blue-50 to-purple-50 px-2.5 py-1.5 rounded-lg border border-blue-100"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center",
                              channelInfo.color
                            )}
                          >
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="font-medium text-gray-700">
                            {channelInfo.name}:
                          </span>
                          <span className="text-gray-600">
                            {timeArray.slice(0, 2).join(", ")}
                          </span>
                        </div>
                      ) : null;
                    })}

                  {Object.keys(bestTimes).length > 3 && (
                    <p className="text-xs text-gray-500 ml-2">
                      +{Object.keys(bestTimes).length - 3} more channels
                    </p>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">AI-suggested best times</p>
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
              format(new Date(campaign.start_date), "MMM d, yyyy")}
            {campaign.start_date && campaign.end_date && " → "}
            {campaign.end_date &&
              format(new Date(campaign.end_date), "MMM d, yyyy")}
          </span>
        </div>
      )}

      {/* Footer Analytics Bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 pt-4 mt-4",
          "border-t border-gray-200"
        )}
      >
        {/* Posts */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900">
                    {stats.total}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500">
                    Posts
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Total posts prepared</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Live */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Radio className="w-4 h-4 text-green-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-green-600">
                    {stats.published}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500">
                    Live
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Currently active posts</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Engagement */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-blue-600">2.4K</span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500">
                    Reach
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Estimated audience interactions</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Quick Actions Overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4",
          "bg-gradient-to-t from-white/95 to-transparent backdrop-blur-md",
          "opacity-0 group-hover:opacity-100",
          "translate-y-2 group-hover:translate-y-0",
          "transition-all duration-300 ease-out",
          "rounded-b-2xl"
        )}
      >
        <div className="flex items-center justify-end gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-blue-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sharing/campaigns/${campaign.id}`);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">View</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-green-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Edit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-purple-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle duplicate
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Duplicate</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle delete
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Delete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}
