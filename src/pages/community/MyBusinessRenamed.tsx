import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, Users, Calendar, TrendingUp, BarChart3, Plane, Copy, Filter, ExternalLink, Clock, Share2, Search } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import CreateBusinessEventPopup from "@/components/CreateBusinessEventPopup";
import CreateServicePopup from "@/components/CreateServicePopup";
import { BusinessTypeSelector } from "@/components/business/BusinessTypeSelector";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";

import { communityNavigation } from "@/config/navigation";
import { OrganizerEventsSection } from "@/components/business/OrganizerEventsSection";
import { useIsReseller } from "@/hooks/useIsReseller";
import { ResellerHeader } from "@/components/reseller/ResellerHeader";
import { ResellerEventsTab } from "@/components/reseller/ResellerEventsTab";
import { ResellerCampaignsTab } from "@/components/reseller/ResellerCampaignsTab";
import { ResellerSalesTab } from "@/components/reseller/ResellerSalesTab";
import { ResellerAvailableEventsTab } from "@/components/reseller/ResellerAvailableEventsTab";
import { AutopilotSuggestionsBanner } from "@/components/reseller/AutopilotSuggestionsBanner";

export default function MyBusiness() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showBusinessTypeSelector, setShowBusinessTypeSelector] = useState(false);
  const [resellerSearchQuery, setResellerSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("management");
  
  const { isReseller } = useIsReseller();
  const latestActions = getLatestActions(2);

  // Handle URL param for tab selection (e.g., ?tab=reseller)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "reseller" && isReseller) {
      setActiveTab("reseller");
    } else if (tabParam && ["management", "referrals", "analytics", "clients"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, isReseller]);

  return (
    <AppLayout>
      <SEO title="My Business | Community" description="Manage your wellness services and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  My Business Hub 💼
                </h1>
                <p className="text-muted-foreground">
                  Grow your wellness business and manage clients effortlessly
                </p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => (
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
            
            {/* Vitana Index Card - Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search Business…"
              onSearch={(query) => console.log('Search Business:', query)}
            />
            <UniversalCalendarButton />
            <Button
              variant="default" 
              size="sm"
              onClick={() => setShowBusinessTypeSelector(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Business
            </Button>
          </UtilityActionButton>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(34,197,94,0.1)] hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-500/20 shadow-lg shadow-green-500/20">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">$2,450</p>
                  <p className="text-xs text-muted-foreground">Revenue this month</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-300 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400/20 to-cyan-500/20 shadow-lg shadow-blue-500/20">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">147</p>
                  <p className="text-xs text-muted-foreground">Active clients</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] transition-all duration-300 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400/20 to-fuchsia-500/20 shadow-lg shadow-purple-500/20">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">23</p>
                  <p className="text-xs text-muted-foreground">Upcoming sessions</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(251,191,36,0.1)] hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-all duration-300 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 shadow-lg shadow-yellow-500/20">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">4.9</p>
                  <p className="text-xs text-muted-foreground">Average rating</p>
                </div>
              </div>
            </div>
          </div>


          {/* Split Bar Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
            <SplitBarList>
              <SplitBarTrigger value="management">
                💼 Management
              </SplitBarTrigger>
              {isReseller && (
                <SplitBarTrigger value="reseller">
                  🎫 Sell & Earn
                </SplitBarTrigger>
              )}
              <SplitBarTrigger value="referrals">
                👥 Referrals
              </SplitBarTrigger>
              <SplitBarTrigger value="analytics">
                📊 Analytics
              </SplitBarTrigger>
              <SplitBarTrigger value="clients">
                👤 Clients
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="management" className="space-y-4">
              <OrganizerEventsSection />
            </SplitBarContent>

            {isReseller && (
              <SplitBarContent value="reseller" className="space-y-6">
                <AutopilotSuggestionsBanner />
                <ResellerHeader />
                
                <Tabs defaultValue="events" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="events">My Events</TabsTrigger>
                    <TabsTrigger value="available">Available to Sell</TabsTrigger>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                  </TabsList>
                  <TabsContent value="events">
                    <ResellerEventsTab searchQuery={resellerSearchQuery} />
                  </TabsContent>
                  <TabsContent value="available">
                    <ResellerAvailableEventsTab />
                  </TabsContent>
                  <TabsContent value="campaigns">
                    <ResellerCampaignsTab searchQuery={resellerSearchQuery} />
                  </TabsContent>
                  <TabsContent value="sales">
                    <ResellerSalesTab />
                  </TabsContent>
                </Tabs>
              </SplitBarContent>
            )}

            <SplitBarContent value="referrals" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">$1,250</p>
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">$320</p>
                        <p className="text-sm text-muted-foreground">This Month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">16</p>
                        <p className="text-sm text-muted-foreground">Active Referrals</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Your Referral Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">WELLNESS2024</p>
                        <p className="text-sm text-muted-foreground">Earn 20% commission on each successful referral</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Share this code with friends and earn 20% of their subscription fee as monthly recurring commission.
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Revenue analytics will be displayed here</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Popular Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Service popularity metrics</p>
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            <SplitBarContent value="clients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Client list and communication tools</p>
                </CardContent>
              </Card>
            </SplitBarContent>

          </SplitBar>
        </div>
      </div>

      {showCreatePopup && (
        <CreateBusinessEventPopup 
          isOpen={showCreatePopup}
          onClose={() => setShowCreatePopup(false)}
        />
      )}
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />

      {/* Create Service Popup */}
      <CreateServicePopup 
        isOpen={showCreateService}
        onClose={() => setShowCreateService(false)}
      />

      {/* Business Type Selector */}
      <BusinessTypeSelector
        isOpen={showBusinessTypeSelector}
        onClose={() => setShowBusinessTypeSelector(false)}
        onSelectEvent={() => setShowCreatePopup(true)}
        onSelectService={() => setShowCreateService(true)}
      />
    </AppLayout>
  );
}