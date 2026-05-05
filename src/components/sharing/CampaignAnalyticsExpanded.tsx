import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  TrendingUp,
  Users,
  MousePointerClick,
  DollarSign,
  Calendar,
  Instagram,
  Linkedin,
  Facebook,
  Mail,
  Download,
  ExternalLink,
  MessageSquare,
  Phone,
} from "lucide-react";
import { XIcon } from "@/components/icons/XIcon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Campaign } from "@/hooks/useCampaigns";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampaignAnalytics } from "@/hooks/useCampaignAnalytics";
import { notifySuccess } from '@/lib/i18n-toast';

interface CampaignAnalyticsExpandedProps {
  campaign: Campaign;
  stats: {
    total: number;
    published: number;
    drafts: number;
  };
  onClose: () => void;
}

// Mock analytics data - replace with real data from backend
const MOCK_ANALYTICS = {
  reach: 12400,
  engagement: 2847,
  ctr: 3.4,
  conversions: 142,
  channelBreakdown: [
    { channel: "facebook", name: "Facebook", reach: 4200, engagement: 890, color: "bg-blue-600" },
    { channel: "instagram", name: "Instagram", reach: 3800, engagement: 1020, color: "bg-pink-600" },
    { channel: "linkedin", name: "LinkedIn", reach: 2900, engagement: 687, color: "bg-blue-700" },
    { channel: "email", name: "Email", reach: 1500, engagement: 250, color: "bg-teal-600" },
  ],
  trendData: [
    { date: "Week 1", reach: 2100 },
    { date: "Week 2", reach: 3400 },
    { date: "Week 3", reach: 4200 },
    { date: "Week 4", reach: 2700 },
  ],
};

function getChannelIcon(channel: string): LucideIcon | React.ComponentType<any> {
  const icons: Record<string, LucideIcon | React.ComponentType<any>> = {
    facebook: Facebook,
    instagram: Instagram,
    linkedin: Linkedin,
    twitter: XIcon,
    email: Mail,
    sms: Phone,
    whatsapp: MessageSquare,
  };
  return icons[channel] || Mail;
}

function getChannelColor(channel: string): string {
  const colors: Record<string, string> = {
    facebook: "bg-blue-600",
    instagram: "bg-pink-600",
    linkedin: "bg-blue-700",
    twitter: "bg-gray-900",
    email: "bg-teal-600",
    sms: "bg-green-600",
    whatsapp: "bg-green-500",
  };
  return colors[channel] || "bg-gray-600";
}

function generateCSV(campaign: Campaign, analytics: typeof MOCK_ANALYTICS): string {
  const rows: string[][] = [];
  
  // Header
  rows.push(['Campaign Analytics Report']);
  rows.push(['Campaign Name', campaign.name]);
  rows.push(['Date Range', campaign.start_date && campaign.end_date 
    ? `${format(new Date(campaign.start_date), "MMM d, yyyy")} - ${format(new Date(campaign.end_date), "MMM d, yyyy")}`
    : 'N/A'
  ]);
  rows.push(['Status', campaign.status]);
  rows.push([]);
  
  // Summary Metrics
  rows.push(['Performance Summary']);
  rows.push(['Metric', 'Value']);
  rows.push(['Total Reach', analytics.reach.toLocaleString()]);
  rows.push(['Engagement', analytics.engagement.toLocaleString()]);
  rows.push(['Click Rate (CTR)', `${analytics.ctr}%`]);
  rows.push(['Conversions', analytics.conversions.toString()]);
  rows.push([]);
  
  // Channel Breakdown
  rows.push(['Channel Performance']);
  rows.push(['Channel', 'Reach', 'Engagement']);
  analytics.channelBreakdown.forEach(channel => {
    rows.push([channel.name, channel.reach.toString(), channel.engagement.toString()]);
  });
  rows.push([]);
  
  // Trend Data
  rows.push(['Reach Trend']);
  rows.push(['Period', 'Reach']);
  analytics.trendData.forEach(data => {
    rows.push([data.date, data.reach.toString()]);
  });
  
  // Convert to CSV format
  return rows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function CampaignAnalyticsExpanded({
  campaign,
  stats,
  onClose,
}: CampaignAnalyticsExpandedProps) {
  const navigate = useNavigate();
  const { analytics: realAnalytics, isLoading } = useCampaignAnalytics(campaign.id);
  
  // Use real analytics if available, fallback to mock for UI testing
  const hasRealData = realAnalytics && realAnalytics.totalRecipients > 0;
  const displayData = hasRealData ? {
    reach: realAnalytics.totalDelivered,
    engagement: realAnalytics.totalOpened,
    ctr: realAnalytics.clickRate,
    conversions: realAnalytics.totalClicked,
    channelBreakdown: realAnalytics.channels.map(ch => ({
      channel: ch.channel,
      name: ch.channel.charAt(0).toUpperCase() + ch.channel.slice(1),
      reach: ch.delivered,
      engagement: ch.opened,
      color: getChannelColor(ch.channel),
    })),
    trendData: MOCK_ANALYTICS.trendData, // Use mock trend data for now
  } : MOCK_ANALYTICS;

  const maxReach = Math.max(...displayData.channelBreakdown.map((c) => c.reach), 1);

  const handleExportReport = () => {
    const csvContent = generateCSV(campaign, displayData);
    const filename = `campaign-analytics-${campaign.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCSV(csvContent, filename);
    notifySuccess('toasts.sharing.analyticsReportDownloadedSuccessfully');
  };

  const handleOpenFullDashboard = () => {
    navigate(`/sharing/campaigns/${campaign.id}`);
  };

  return (
    <div className={cn(
      "mt-4 overflow-hidden",
      "animate-in slide-in-from-top-2 fade-in duration-250"
    )}>
      <Card className={cn(
        "border-2 rounded-2xl p-6",
        "bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-xl",
        "border-teal-200/50 shadow-2xl shadow-teal-100/30"
      )}>
        {/* Top Bar */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {campaign.name}
              </h3>
              <Badge className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 border-teal-300">
                Analytics
              </Badge>
            </div>
            {campaign.start_date && campaign.end_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(campaign.start_date), "MMM d")} - {format(new Date(campaign.end_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Summary Metrics */}
          <div className="lg:col-span-1 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Performance Summary
            </h4>
            
            {/* Delivered Card */}
            <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Delivered</p>
                  <p className="text-2xl font-bold text-teal-700">
                    {displayData.reach.toLocaleString()}
                  </p>
                  {hasRealData && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {realAnalytics.deliveryRate.toFixed(1)}% rate
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-teal-200/50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-teal-700" />
                </div>
              </div>
            </Card>

            {/* Opened Card */}
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Opened</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {displayData.engagement.toLocaleString()}
                  </p>
                  {hasRealData && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {realAnalytics.openRate.toFixed(1)}% rate
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-200/50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-700" />
                </div>
              </div>
            </Card>

            {/* Click Rate Card */}
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Click Rate</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {displayData.ctr.toFixed(1)}%
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-200/50 flex items-center justify-center">
                  <MousePointerClick className="w-5 h-5 text-purple-700" />
                </div>
              </div>
            </Card>

            {/* Clicks Card */}
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Clicks</p>
                  <p className="text-2xl font-bold text-green-700">
                    {displayData.conversions}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-200/50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-700" />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Channel Breakdown & Trend */}
          <div className="lg:col-span-2 space-y-6">
            {/* Channel Breakdown */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Channel Performance
              </h4>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading analytics...
                  </div>
                ) : displayData.channelBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No channel data available yet
                  </div>
                ) : (
                  displayData.channelBreakdown.map((channel) => {
                    const Icon = getChannelIcon(channel.channel);
                    const reachPercent = (channel.reach / maxReach) * 100;

                    return (
                      <div
                        key={channel.channel}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-gray-200 hover:bg-white/80 transition-all"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          channel.color
                        )}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {channel.name}
                            </span>
                            <span className="text-sm font-bold text-gray-700">
                              {channel.reach.toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                "bg-gradient-to-r from-teal-400 to-blue-500"
                              )}
                              style={{ width: `${reachPercent}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {channel.engagement.toLocaleString()} opened
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Trend Chart (Simple Bar Chart) */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Reach Trend
              </h4>
              <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
                {/* Chart Area */}
                <div className="flex items-end justify-between gap-3 h-32 mb-3">
                  {displayData.trendData.map((data, index) => {
                    const maxTrend = Math.max(...displayData.trendData.map((d) => d.reach));
                    const heightPercent = (data.reach / maxTrend) * 100;
                    const minHeight = 8; // Minimum 8px even for smallest values

                    return (
                      <div 
                        key={index} 
                        className="flex-1 relative group"
                      >
                        {/* Tooltip on hover */}
                        <div className={cn(
                          "absolute -top-8 left-1/2 -translate-x-1/2",
                          "opacity-0 group-hover:opacity-100 transition-opacity",
                          "bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                        )}>
                          {data.reach.toLocaleString()}
                        </div>
                        
                        {/* Bar */}
                        <div
                          className={cn(
                            "w-full rounded-t-lg transition-all duration-500 cursor-pointer",
                            "bg-gradient-to-t from-teal-400 to-pink-400",
                            "hover:from-teal-500 hover:to-pink-500 hover:shadow-lg"
                          )}
                          style={{ 
                            height: `${Math.max(heightPercent, minHeight)}%`
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Labels */}
                <div className="flex items-center justify-between gap-3">
                  {displayData.trendData.map((data, index) => (
                    <div key={index} className="flex-1 text-center">
                      <span className="text-xs text-gray-600 font-medium">
                        {data.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200/50">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportReport}
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
            onClick={handleOpenFullDashboard}
          >
            Open Full Dashboard
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
