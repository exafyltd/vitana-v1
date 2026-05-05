import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Badge } from "@/components/ui/badge";

import { Plus, Plane, Users, TrendingUp, BarChart3 } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useUnifiedEarnings } from "@/hooks/useUnifiedEarnings";
import { CreateSelectionDialog } from "@/components/CreateSelectionDialog";
import { CreateEventPopup } from "@/components/CreateEventPopup";
import { CreateMeetupPopup } from "@/components/CreateMeetupPopup";
import CreateServicePopup from "@/components/CreateServicePopup";
import { BusinessTypeSelector } from "@/components/business/BusinessTypeSelector";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";

import { businessHubNavigation } from "@/config/navigation";
import { useIsReseller } from "@/hooks/useIsReseller";
import { BusinessHubOverview } from "@/components/business/BusinessHubOverview";
import { ServicesSubTabs } from "@/components/business/ServicesSubTabs";
import { ClientsSubTabs } from "@/components/business/ClientsSubTabs";
import { SellAndEarnSubTabs } from "@/components/business/SellAndEarnSubTabs";
import { AnalyticsSubTabs } from "@/components/business/AnalyticsSubTabs";
import { OrganizerEventsSection } from "@/components/business/OrganizerEventsSection";
import { PackageCard } from "@/components/business/PackageCard";
import { useBusinessPackages } from "@/hooks/useBusinessPackages";
import { ResellerAvailableEventsTab } from "@/components/reseller/ResellerAvailableEventsTab";
import { ResellerCampaignsTab } from "@/components/reseller/ResellerCampaignsTab";
import { VaeaDraftsStrip } from "@/components/business/vaea/VaeaDraftsStrip";
import { VaeaCatalogPanel } from "@/components/business/vaea/VaeaCatalogPanel";
import { VaeaDetectedList } from "@/components/business/vaea/VaeaDetectedList";
import { Briefcase, Package, Loader2 as Loader2Icon } from "lucide-react";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { useIsMobile } from "@/hooks/use-mobile";
// MobileBusinessNav removed - consolidated into single SplitBar
import { MobileKPIStrip } from "@/components/business/MobileKPIStrip";
import { MobileEarningPortal } from "@/components/business/MobileEarningPortal";
import { EarningsHistoryLedger } from "@/components/business/EarningsHistoryLedger";
import {
  SplitBar,
  SplitBarList,
  SplitBarTrigger,
  SplitBarContent,
} from "@/components/ui/split-bar";
import { useTranslation } from "@/hooks/useTranslation";
import { MobileModePill } from "@/components/ui/MobileModePill";
import { t } from '@/lib/i18n-toast';

type TabValue = "overview" | "services" | "clients" | "sell-earn" | "analytics";

export default function BusinessHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { translate } = useTranslation();
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [mobileTab, setMobileTab] = useState("snapshot");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showBusinessTypeSelector, setShowBusinessTypeSelector] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  
  const { isReseller } = useIsReseller();
  const { earnings } = useUnifiedEarnings();
  const { packages, isLoading: isLoadingPackages } = useBusinessPackages();
  const latestActions = getLatestActions(2);

  // Add subtle earnings indicator to Sell & Earn tab
  const navigationWithIndicator = useMemo(() => {
    // TEMP: Force indicator to show for preview (revert to actual logic later)
    const hasEarnings = true; // (earnings?.totalEarnings ?? 0) > 0 || (earnings?.pendingPayout ?? 0) > 0;
    
    return businessHubNavigation.map(item => {
      if (item.id === 'sell-earn' && hasEarnings) {
        return {
          ...item,
          indicator: (
            <span 
              className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/15"
              aria-hidden="true"
            />
          )
        };
      }
      return item;
    });
  }, [earnings]);

  // Derive active tab from URL path
  const activeTab = useMemo((): TabValue => {
    const path = location.pathname;
    if (path === "/business/services") return "services";
    if (path === "/business/clients") return "clients";
    if (path === "/business/sell-earn") {
      // Only allow sell-earn if user is reseller
      return isReseller ? "sell-earn" : "overview";
    }
    if (path === "/business/analytics") return "analytics";
    return "overview";
  }, [location.pathname, isReseller]);

  // Navigate when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    if (newTab === "overview") {
      navigate("/business");
    } else {
      navigate(`/business/${newTab}`);
    }
  };

  // Mobile-specific layout - single screen with consolidated SplitBar (matches Events/LiveRooms/MediaHub pattern)
  if (isMobile) {
    return (
      <AppLayout>
        <SEO 
          title={t('screens.businesshub.businessHubVitana')} 
          description="Grow your wellness business" 
          canonical={window.location.href} 
        />
        
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
          <div className="px-4 pt-1 pb-32 space-y-1">
            {/* StandardHeader - same pattern as Events/LiveRooms/MediaHub */}
            <StandardHeader
              title={translate('businessHub.title', 'Business Hub')}
              description={translate('businessHub.description', 'Grow your wellness business')}
            />
            
            {/* Action Rail - same pattern */}
            <UtilityActionButton compact
              className="min-w-0"
              afterGiftVoucherChildren={
                <>
                  {/* Vitana Index - pill style */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/health')}
                    className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
                  >
                    <span className="text-xs opacity-60">🧬</span>
                    <span className="text-sm font-medium text-primary"><VitanaIndexValue /></span>
                  </Button>
                  
                  {/* Autopilot - pill style with label */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setAutopilotOpen(true)}
                    className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0"
                  >
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
                    {pendingCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
                      >
                        {pendingCount}
                      </Badge>
                    )}
                  </Button>
                </>
              }
            >
              <div className="flex items-center gap-2 min-w-max">
                <ExpandableSearchButton 
                  placeholder={translate('businessHub.searchBusiness', 'Search business...')}
                  onSearch={(query) => console.log('Search:', query)}
                />
                
                {/* Mode pill - replaces SplitBarList on mobile */}
                <MobileModePill
                  modes={[
                    { value: "snapshot", label: translate('businessHub.tabs.snapshot', 'Snapshot'), icon: "📊" },
                    { value: "services", label: translate('businessHub.tabs.services', 'Services'), icon: "💼", children: [
                      { value: "services.services", label: "My Services", icon: "💼" },
                      { value: "services.events", label: "My Events", icon: "📅" },
                      { value: "services.packages", label: "Packages", icon: "📦" },
                    ]},
                    ...(isReseller ? [{ value: "sales", label: translate('businessHub.tabs.sales', 'Sales'), icon: "🎫", children: [
                      { value: "sales.inventory", label: "Inventory", icon: "📦" },
                      { value: "sales.promotions", label: "Promotions", icon: "📣" },
                      { value: "sales.referrals", label: "Referrals", icon: "🤝" },
                    ]}] : []),
                    { value: "insights", label: translate('businessHub.tabs.insights', 'Insights'), icon: "📈", children: [
                      { value: "insights.clients", label: "Clients", icon: "👥" },
                      { value: "insights.performance", label: "Performance", icon: "📊" },
                      { value: "insights.earnings", label: "Earnings", icon: "💵" },
                      { value: "insights.growth", label: "Growth", icon: "📈" },
                    ]},
                  ]}
                  activeMode={mobileTab}
                  onModeChange={setMobileTab}
                />
                
                <UniversalCalendarButton />
                
                {/* Create button - primary action */}
                <Button 
                  onClick={() => setShowBusinessTypeSelector(true)}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">{translate('buttons.create', 'Create')}</span>
                </Button>
              </div>
            </UtilityActionButton>
            
            {/* Content driven by mobileTab */}
            <div className="mt-1 space-y-3">
              {/* Snapshot */}
              {mobileTab === "snapshot" && (
                <div className="space-y-3 pt-1">
                  <MobileKPIStrip 
                    totalEarnings={earnings.totalEarnings}
                    earnings30Days={earnings.earnings30Days}
                    pendingPayout={earnings.pendingPayout}
                    inWallet={earnings.inWallet}
                    isLoading={false}
                  />
                  <MobileEarningPortal 
                    onCreateEvent={() => setShowSelectionDialog(true)}
                    onAddToInventory={() => setMobileTab("sales.inventory")}
                    onCreateService={() => setShowCreateService(true)}
                    onCreatePromotion={() => setShowCampaignDialog(true)}
                  />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground px-1">{translate('businessHub.recentActivity', 'Recent Activity')}</h3>
                    <EarningsHistoryLedger
                      transactions={earnings.recentTransactions}
                      isLoading={false}
                    />
                  </div>
                </div>
              )}

              {/* Services → My Services */}
              {mobileTab === "services.services" && (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.businesshub.noServicesYet')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('screens.businesshub.createCoachingSessionsConsultationsOtherServices')}
                  </p>
                  <Button onClick={() => setShowCreateService(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('screens.businesshub.createService')}
                  </Button>
                </div>
              )}

              {/* Services → My Events */}
              {mobileTab === "services.events" && (
                <OrganizerEventsSection />
              )}

              {/* Services → Packages */}
              {mobileTab === "services.packages" && (
                <div className="space-y-4">
                  {isLoadingPackages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : packages.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.businesshub.createSessionPackages')}</h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        {t('screens.businesshub.bundleMultipleSessionsEventsPerksInto')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {packages.map((pkg) => (
                        <PackageCard key={pkg.id} pkg={pkg} onEdit={() => {}} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sales → drafts strip visible across all sales sub-modes */}
              {mobileTab?.startsWith("sales.") && <VaeaDraftsStrip />}

              {/* Sales → Inventory */}
              {mobileTab === "sales.inventory" && (
                <ResellerAvailableEventsTab />
              )}

              {/* Sales → Promotions */}
              {mobileTab === "sales.promotions" && (
                <ResellerCampaignsTab searchQuery="" />
              )}

              {/* Sales → Referrals (Autopilot) */}
              {mobileTab === "sales.referrals" && (
                <div className="space-y-4">
                  <VaeaCatalogPanel />
                  <VaeaDetectedList collapsible limit={25} />
                </div>
              )}

              {/* Insights → Clients */}
              {mobileTab === "insights.clients" && (
                <ClientsSubTabs />
              )}

              {/* Insights → Performance */}
              {mobileTab === "insights.performance" && (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.businesshub.performance')}</h3>
                  <p className="text-sm text-muted-foreground">{t('screens.businesshub.bookingAnalyticsComingSoon')}</p>
                </div>
              )}

              {/* Insights → Earnings */}
              {mobileTab === "insights.earnings" && (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.businesshub.earnings')}</h3>
                  <p className="text-sm text-muted-foreground">{t('screens.businesshub.earningsBreakdownComingSoon')}</p>
                </div>
              )}

              {/* Insights → Growth */}
              {mobileTab === "insights.growth" && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.businesshub.growth')}</h3>
                  <p className="text-sm text-muted-foreground">{t('screens.businesshub.growthAnalyticsComingSoon')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialogs for mobile */}
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
          eventContext="community"
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

  // Desktop layout - unchanged
  return (
    <AppLayout>
      <SEO 
        title={t('screens.businesshub.businessHubVitana')} 
        description="Grow your wellness business and manage clients effortlessly" 
        canonical={window.location.href} 
      />
      <SubNavigation items={navigationWithIndicator} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {t('screens.businesshub.businessHub')}
                </h1>
                <p className="text-muted-foreground">
                  {t('screens.businesshub.growYourWellnessBusinessManageClients')}
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
                <span className="text-sm font-medium text-red-400">{translate('actionBar.autopilot', 'Autopilot')}</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">{t('screens.businesshub.latestActions')}</div>
                  {latestActions.map((action) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
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
              placeholder={t('screens.businesshub.searchBusiness')}
              onSearch={(query) => console.log('Search Business:', query)}
            />
            <UniversalCalendarButton />
            <Button
              variant="default" 
              size="sm"
              onClick={() => setShowBusinessTypeSelector(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.businesshub.business')}
            </Button>
          </UtilityActionButton>

          {/* Tab Content - Rendered based on active route */}
          {activeTab === "overview" && (
            <BusinessHubOverview 
              onCreateService={() => setShowCreateService(true)}
              onCreateEvent={() => setShowSelectionDialog(true)}
              onCreateCampaign={() => setShowCampaignDialog(true)}
            />
          )}

          {activeTab === "services" && (
            <ServicesSubTabs onCreateService={() => setShowCreateService(true)} />
          )}

          {activeTab === "clients" && (
            <ClientsSubTabs />
          )}

          {activeTab === "sell-earn" && isReseller && (
            <SellAndEarnSubTabs />
          )}

          {activeTab === "analytics" && (
            <AnalyticsSubTabs />
          )}
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
        eventContext="community"
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
