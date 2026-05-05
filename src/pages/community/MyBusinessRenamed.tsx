import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Plus, Plane } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { CreateSelectionDialog } from "@/components/CreateSelectionDialog";
import { CreateEventPopup } from "@/components/CreateEventPopup";
import { CreateMeetupPopup } from "@/components/CreateMeetupPopup";
import CreateServicePopup from "@/components/CreateServicePopup";
import { BusinessTypeSelector } from "@/components/business/BusinessTypeSelector";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";

import { communityNavigation } from "@/config/navigation";
import { useIsReseller } from "@/hooks/useIsReseller";
import { BusinessHubOverview } from "@/components/business/BusinessHubOverview";
import { ServicesSubTabs } from "@/components/business/ServicesSubTabs";
import { ClientsSubTabs } from "@/components/business/ClientsSubTabs";
import { SellAndEarnSubTabs } from "@/components/business/SellAndEarnSubTabs";
import { AnalyticsSubTabs } from "@/components/business/AnalyticsSubTabs";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { t } from '@/lib/i18n-toast';

type TabValue = "overview" | "services" | "clients" | "sell-earn" | "analytics";

export default function MyBusiness() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showBusinessTypeSelector, setShowBusinessTypeSelector] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  
  const { isReseller } = useIsReseller();
  const latestActions = getLatestActions(2);

  // Handle URL param for tab selection
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabValue | null;
    const validTabs: TabValue[] = ["overview", "services", "clients", "sell-earn", "analytics"];
    
    if (tabParam && validTabs.includes(tabParam)) {
      // Only allow sell-earn tab if user is reseller
      if (tabParam === "sell-earn" && !isReseller) {
        setActiveTab("overview");
      } else {
        setActiveTab(tabParam);
      }
    } else {
      setActiveTab("overview");
    }
  }, [searchParams, isReseller]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);
    if (newTab === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: newTab });
    }
  };

  return (
    <AppLayout>
      <SEO title={t('screens.community.businessHubCommunity')} description="Manage your wellness services, events, and clients" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {t('screens.community.businessHub')}
                </h1>
                <p className="text-muted-foreground">
                  {t('screens.community.growYourWellnessBusinessManageClients')}
                </p>
              </div>
            </div>
            
            {/* Autopilot Card */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">{t('screens.community.autopilot')}</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">{t('screens.community.latestActions')}</div>
                  {latestActions.map((action) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">{t('screens.community.value0MoreActions', { value0: pendingCount - 2 })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Vitana Index Card */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600"><VitanaIndexValue /></span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder={t('screens.community.searchBusiness')}
              onSearch={(query) => console.log('Search Business:', query)}
            />
            <UniversalCalendarButton />
            <Button
              variant="default" 
              size="sm"
              onClick={() => setShowBusinessTypeSelector(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.community.business')}
            </Button>
          </UtilityActionButton>

          {/* Main Tab Navigation - 5 Tabs */}
          <SplitBar value={activeTab} onValueChange={handleTabChange} className="w-full mb-6">
            <SplitBarList>
              <SplitBarTrigger value="overview">
                {t('screens.community.overview')}
              </SplitBarTrigger>
              <SplitBarTrigger value="services">
                {t('screens.community.services')}
              </SplitBarTrigger>
              <SplitBarTrigger value="clients">
                {t('screens.community.clients')}
              </SplitBarTrigger>
              {isReseller && (
                <SplitBarTrigger value="sell-earn">{t('screens.community.sellEarn')}
                </SplitBarTrigger>
              )}
              <SplitBarTrigger value="analytics">
                {t('screens.community.analytics')}
              </SplitBarTrigger>
            </SplitBarList>

            {/* Overview Tab */}
            <SplitBarContent value="overview">
              <BusinessHubOverview 
                onCreateService={() => setShowCreateService(true)}
                onCreateEvent={() => setShowSelectionDialog(true)}
                onCreateCampaign={() => setShowCampaignDialog(true)}
              />
            </SplitBarContent>

            {/* Services Tab */}
            <SplitBarContent value="services">
              <ServicesSubTabs onCreateService={() => setShowCreateService(true)} />
            </SplitBarContent>

            {/* Clients Tab */}
            <SplitBarContent value="clients">
              <ClientsSubTabs />
            </SplitBarContent>

            {/* Sell & Earn Tab (Reseller Only) */}
            {isReseller && (
              <SplitBarContent value="sell-earn">
                <SellAndEarnSubTabs />
              </SplitBarContent>
            )}

            {/* Analytics Tab */}
            <SplitBarContent value="analytics">
              <AnalyticsSubTabs />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      {/* Popups and Dialogs */}
      <CreateSelectionDialog
        open={showSelectionDialog}
        onOpenChange={setShowSelectionDialog}
        onSelectEvent={() => {
          setShowSelectionDialog(false);
          setShowCreateEvent(true);
        }}
        onSelectMeetup={() => {
          setShowSelectionDialog(false);
          setShowCreateMeetup(true);
        }}
      />

      <CreateEventPopup
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
      />

      <CreateMeetupPopup
        isOpen={showCreateMeetup}
        onClose={() => setShowCreateMeetup(false)}
      />
      
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />

      <CreateServicePopup 
        isOpen={showCreateService}
        onClose={() => setShowCreateService(false)}
      />

      <BusinessTypeSelector
        isOpen={showBusinessTypeSelector}
        onClose={() => setShowBusinessTypeSelector(false)}
        onSelectEvent={() => setShowSelectionDialog(true)}
        onSelectService={() => setShowCreateService(true)}
      />

      <CampaignDialog
        open={showCampaignDialog}
        onOpenChange={setShowCampaignDialog}
      />
    </AppLayout>
  );
}
