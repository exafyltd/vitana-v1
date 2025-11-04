import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Plus, DollarSign, Users, Calendar, TrendingUp, BarChart3, Plane, Copy, Filter, ExternalLink, Clock, Share2, Search, Briefcase, UserPlus } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import CreateBusinessEventPopup from "@/components/CreateBusinessEventPopup";
import CreateServicePopup from "@/components/CreateServicePopup";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";

import { communityNavigation } from "@/config/navigation";

export default function MyBusiness() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="My Business | Community" description="Manage your wellness services and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Shortened Header Bar - Welcome Message */}
            <div className="flex-1 bg-gradient-to-br from-white/90 via-pink-50/80 to-fuchsia-50/70 backdrop-blur-xl rounded-3xl p-8 shadow-[0_0_40px_rgba(236,72,153,0.15)] border border-white/30 relative overflow-hidden">
              <div className="absolute top-0 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent mb-2">
                    My Business Hub
                  </h1>
                  <p className="text-base text-muted-foreground">
                    Grow your wellness business and manage clients effortlessly
                  </p>
                </div>
                <div className="hidden md:block">
                  <Briefcase className="w-12 h-12 text-pink-500/60" />
                </div>
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
              onClick={() => setShowCreateService(true)}
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
          <SplitBar defaultValue="management" className="w-full mb-6">
            <SplitBarList>
              <SplitBarTrigger value="management" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Management
              </SplitBarTrigger>
              <SplitBarTrigger value="referrals" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Referrals
              </SplitBarTrigger>
              <SplitBarTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </SplitBarTrigger>
              <SplitBarTrigger value="clients" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Clients
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="management" className="space-y-4">
              <div className="grid gap-4">
                <div className="relative rounded-2xl bg-white/80 backdrop-blur-md border border-white/20 shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-all duration-300 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-pink-500" />
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">Morning Yoga Flow</h3>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                            <span className="text-xs text-green-600 font-medium">Active</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Recurring • Mon, Wed, Fri at 7:00 AM</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-border/50 bg-gradient-to-r from-white/50 to-pink-50/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">12/15</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">$25</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="font-medium">4.8</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-full px-4 py-1 h-8 text-xs hover:bg-pink-50 border-pink-200">
                          Edit
                        </Button>
                        <Button size="sm" className="rounded-full px-4 py-1 h-8 text-xs bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-2xl bg-white/80 backdrop-blur-md border border-white/20 shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-all duration-300 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-emerald-500" />
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">Nutrition Consultation</h3>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                            <span className="text-xs text-green-600 font-medium">Active</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">One-on-one • 60 minutes</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-border/50 bg-gradient-to-r from-white/50 to-emerald-50/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">$80</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="font-medium">5.0</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-full px-4 py-1 h-8 text-xs hover:bg-pink-50 border-pink-200">
                          Edit
                        </Button>
                        <Button size="sm" className="rounded-full px-4 py-1 h-8 text-xs bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-2xl bg-white/80 backdrop-blur-md border border-white/20 shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-all duration-300 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500" />
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">Weekend Wellness Workshop</h3>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className="text-xs text-blue-600 font-medium">In 5 days</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Saturday, Dec 16 • 10:00 AM - 4:00 PM</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-border/50 bg-gradient-to-r from-white/50 to-purple-50/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">8/20</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">$150</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-full px-4 py-1 h-8 text-xs hover:bg-pink-50 border-pink-200">
                          Edit
                        </Button>
                        <Button size="sm" className="rounded-full px-4 py-1 h-8 text-xs bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

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
    </AppLayout>
  );
}