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
import type { Campaign } from "@/hooks/useCampaigns";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampaignAnalytics } from "@/hooks/useCampaignAnalytics";
import { notifySuccess, t } from '@/lib/i18n-toast';

import { fmtDateTime, formatDate } from '@/lib/locale-format';
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
    ? `${formatDate(new Date(campaign.start_date), "MMM d, yyyy")} - ${formatDate(new Date(campaign.end_date), "MMM d, yyyy")}`
    : 'N/A'
  ]);
  rows.push(['Status', campaign.status]);
  rows.push([]);
  
  // Summary Metrics
  rows.push(['Performance Summary']);
  rows.push(['Metric', 'Value']);
  rows.push(['Total Reach', fmtDateTime(analytics.reach)]);
  rows.push(['Engagement', fmtDateTime(analytics.engagement)]);
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
    const filename = `campaign-analytics-${campaign.name.toLowerCase().replace(/\s+/g, '-')}-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
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
        "bg-gradient-to-br from-card/95 to-surface-sunken/95 backdrop-blur-xl",
        "border-category-1/15 shadow-2xl shadow-category-1/5"
      )}>
        {/* Top Bar */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-border/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-foreground">
                {campaign.name}
              </h3>
              <Badge className="text-xs px-2 py-0.5 bg-category-1/15 text-category-1 border-category-1/40">
                {t('screens.sharing.analytics')}
              </Badge>
            </div>
            {campaign.start_date && campaign.end_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate(new Date(campaign.start_date), "MMM d")} - {formatDate(new Date(campaign.end_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Summary Metrics */}
          <div className="lg:col-span-1 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t('screens.sharing.performanceSummary')}
            </h4>
            
            {/* Delivered Card */}
            <Card className="p-4 bg-gradient-to-br from-category-1/10 to-category-1/10 border-category-1/25">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('screens.sharing.delivered')}</p>
                  <p className="text-2xl font-bold text-category-1">
                    {fmtDateTime(displayData.reach)}
                  </p>
                  {hasRealData && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t('screens.sharing.value0Rate', { value0: realAnalytics.deliveryRate.toFixed(1) })}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-category-1/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-category-1" />
                </div>
              </div>
            </Card>

            {/* Opened Card */}
            <Card className="p-4 bg-gradient-to-br from-category-3/10 to-category-3/10 border-category-3/25">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('screens.sharing.opened')}</p>
                  <p className="text-2xl font-bold text-category-3">
                    {fmtDateTime(displayData.engagement)}
                  </p>
                  {hasRealData && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t('screens.sharing.value0Rate', { value0: realAnalytics.openRate.toFixed(1) })}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-category-3/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-category-3" />
                </div>
              </div>
            </Card>

            {/* Click Rate Card */}
            <Card className="p-4 bg-gradient-to-br from-category-2/10 to-category-4/10 border-category-2/25">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('screens.sharing.clickRate')}</p>
                  <p className="text-2xl font-bold text-category-2">
                    {displayData.ctr.toFixed(1)}%
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-category-2/15 flex items-center justify-center">
                  <MousePointerClick className="w-5 h-5 text-category-2" />
                </div>
              </div>
            </Card>

            {/* Clicks Card */}
            <Card className="p-4 bg-gradient-to-br from-status-success-subtle to-status-success-subtle border-status-success/25">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('screens.sharing.totalClicks')}</p>
                  <p className="text-2xl font-bold text-status-success">
                    {displayData.conversions}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-status-success/15 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-status-success" />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Channel Breakdown & Trend */}
          <div className="lg:col-span-2 space-y-6">
            {/* Channel Breakdown */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t('screens.sharing.channelPerformance')}
              </h4>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{t('screens.sharing.loadingAnalytics')}
                  </div>
                ) : displayData.channelBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('screens.sharing.noChannelDataAvailableYet')}
                  </div>
                ) : (
                  displayData.channelBreakdown.map((channel) => {
                    const Icon = getChannelIcon(channel.channel);
                    const reachPercent = (channel.reach / maxReach) * 100;

                    return (
                      <div
                        key={channel.channel}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border hover:bg-card/80 transition-all"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          channel.color
                        )}>
                          <Icon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-foreground">
                              {channel.name}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground">
                              {fmtDateTime(channel.reach)}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                "bg-gradient-to-r from-category-1/80 to-category-3"
                              )}
                              style={{ width: `${reachPercent}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">{t('screens.sharing.value0Opened', { value0: fmtDateTime(channel.engagement) })}
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t('screens.sharing.reachTrend')}
              </h4>
              <div className="p-4 bg-card/60 rounded-xl border border-border">
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
                          // design-allow-next-line: centring with -translate-x-1/2
                          "absolute -top-8 left-1/2 -translate-x-1/2",
                          "opacity-0 group-hover:opacity-100 transition-opacity",
                          "bg-muted-foreground text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap"
                        )}>
                          {fmtDateTime(data.reach)}
                        </div>
                        
                        {/* Bar */}
                        <div
                          className={cn(
                            "w-full rounded-t-lg transition-all duration-500 cursor-pointer",
                            "bg-gradient-to-t from-category-1/80 to-category-4/80",
                            "hover:from-category-1 hover:to-category-4 hover:shadow-lg"
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
                      <span className="text-xs text-muted-foreground font-medium">
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
        <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportReport}
          >
            <Download className="w-4 h-4" />
            {t('screens.sharing.exportReport')}
          </Button>
          
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-category-1 to-category-3 hover:from-category-1 hover:to-category-3"
            onClick={handleOpenFullDashboard}
          >
            {t('screens.sharing.openFullDashboard')}
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
