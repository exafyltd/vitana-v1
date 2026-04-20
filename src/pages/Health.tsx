import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Droplets, Apple, Dumbbell, Moon, Brain, Stethoscope, Target, AlertTriangle, BookOpen, Users, Calendar, ShoppingBag, Activity, Star, TrendingUp, User, FileText, Plane, Search, Plus, Sparkles, Upload } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { HealthMasterActionPopup } from "@/components/HealthMasterActionPopup";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MobileModePill, ModeOption } from "@/components/ui/MobileModePill";
import { NewsCard } from "@/components/crossover/NewsCard";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAutopilotComplete } from "@/hooks/useAutopilotComplete";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import { StackedCardList } from "@/components/ui/stacked-card-list";
import HealthCoachChat from "@/components/health/HealthCoachChat";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { useHealthLogger } from "@/hooks/useHealthLogger";
import CompactVitanaIndex from "@/components/health/CompactVitanaIndex";
import MotivationalDataCard from "@/components/health/MotivationalDataCard";
import NextBestActionCard from "@/components/health/NextBestActionCard";
import { useTranslation } from "@/hooks/useTranslation";

import { healthNavigation } from "@/config/navigation";
import { useProfile } from "@/context/ProfileProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHealthSnapshot } from "@/components/health/mobile/MobileHealthSnapshot";
import { MobilePriorityFocus } from "@/components/health/mobile/MobilePriorityFocus";
import { MobileAutopilotGuidance } from "@/components/health/mobile/MobileAutopilotGuidance";
import { MobileHealthMedicalTab } from "@/components/health/mobile/MobileHealthMedicalTab";
import { MobileHealthSupplementsTab } from "@/components/health/mobile/MobileHealthSupplementsTab";
import { HealthReportUploadSheet } from "@/components/health/mobile/HealthReportUploadSheet";
import { QuickLabOrderSheet } from "@/components/health/mobile/QuickLabOrderSheet";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";

const overviewCards = [
  {
    title: "Overview",
    description: "Your comprehensive health dashboard and wellness overview",
    icon: Target,
    path: "/health",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Services Hub",
    description: "Book doctors, coaching, programs & screenings",
    icon: Stethoscope,
    path: "/health/services-hub",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Biomarkers",
    description: "View your latest test results and biomarkers",
    icon: FileText,
    path: "/health/biomarker-results",
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    title: "My Health Tracker",
    description: "Track your daily nutrition, sleep, exercise and wellness metrics",
    icon: Activity,
    path: "/health-tracker",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Education & Science",
    description: "Learn about health topics and access wellness resources",
    icon: BookOpen,
    path: "/health/education",
    color: "from-purple-500/20 to-indigo-500/20",
  },
];

import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Health() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeBySourceRef } = useAutopilotComplete();
  useEffect(() => { completeBySourceRef('onboarding_health'); }, [completeBySourceRef]);
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const { translate } = useTranslation();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [healthActionsOpen, setHealthActionsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [vitanaScore] = useState(742);
  const [selectedPillar, setSelectedPillar] = useState("overview");
  const [mobileTab, setMobileTab] = useState<'overview' | 'medical' | 'supplements'>('overview');

  const healthModes: ModeOption[] = [
    { value: 'overview', label: translate('health.tabs.overview', 'Overview'), icon: '🏠' },
    { value: 'medical', label: translate('health.tabs.medical', 'Medical'), icon: '🏥' },
    { value: 'supplements', label: translate('health.tabs.supplements', 'Supplements'), icon: '💊' },
  ];
  
  const latestActions = getLatestActions(2);

  // Health pillar data
  const pillars = {
    nutrition: 85,
    exercise: 68,
    sleep: 90,
    hydration: 72,
    mental: 78
  };

  // Find weakest pillar for priority focus
  const pillarEntries = Object.entries(pillars) as [string, number][];
  const weakestPillar = pillarEntries.reduce((min, curr) => 
    curr[1] < min[1] ? curr : min
  , pillarEntries[0]);
  
  // Get translated pillar labels and emojis
  const getPillarLabel = (key: string) => translate(`health.pillars.${key}`);
  const pillarEmojis: Record<string, string> = {
    nutrition: '🥗',
    exercise: '🏃',
    sleep: '😴',
    hydration: '💧',
    mental: '🧠'
  };

  const smartSuggestions = [
    {
      title: "Book Annual Physical",
      description: "Your last checkup was 8 months ago. Schedule with Dr. Smith.",
      type: "action" as const,
      priority: "high" as const,
      action: "Book Now"
    },
    {
      title: "Sleep Score Trending Down",
      description: "Your sleep quality dropped 12% this week. Consider a sleep consultation.",
      type: "insight" as const,
      priority: "medium" as const,
      action: "Get Help"
    },
    {
      title: "Nutrition Community Match",
      description: "Join the Mediterranean Diet group - 3 members near you.",
      type: "recommendation" as const,
      priority: "low" as const,
      action: "Join Group"
    }
  ];

  const autopilotSuggestions = [
    "Book your overdue screening appointments", 
    "Join nutrition group based on your weak pillar",
    "Schedule stress management consultation"
  ];

  useEffect(() => {
    console.log("Health page using healthNavigation:", healthNavigation);
    console.log("Current path:", location.pathname);
  }, []);

  const newsItems = [
    {
      title: "New Mediterranean Diet Study Results",
      description: "Latest research shows 23% improvement in cardiovascular health markers",
      category: "wellness" as const,
      imageUrl: "/placeholder.svg",
      author: { name: "Dr. Sarah Chen", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
      location: "Stanford Medical",
      timestamp: "2 hours ago"
    },
    {
      title: "Community Wellness Challenge", 
      description: "Join 500+ members in our 30-day fitness challenge starting Monday",
      category: "community" as const,
      imageUrl: "/placeholder.svg", 
      author: { name: "Wellness Team", avatar: "/lovable-uploads/design-team-avatar.jpg" },
      location: "Global",
      timestamp: "4 hours ago"
    },
    {
      title: "Personalized Nutrition Plan Available",
      description: "AI-powered meal planning based on your biomarker results and preferences",
      category: "wellness" as const,
      imageUrl: "/placeholder.svg",
      author: { name: "NutriAI", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
      location: "Available Now",
      timestamp: "6 hours ago"
    }
  ];

  // Mobile-specific single-screen dashboard
  if (isMobile) {
    return (
      <AppLayout>
        <SEO title="Health" description="Your personal health dashboard" canonical={window.location.href} />
        
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background pb-32">
          {/* Standard Header */}
          <div className="px-4 pt-2">
            <StandardHeader
              title={translate('health.title', 'Health & Wellness')}
              description={translate('health.subtitle', 'Track and manage your health journey')}
              emoji="🌱"
            />
          </div>

          {/* Utility Action Bar */}
          <div className="px-4">
            <UtilityActionButton
              compact
              className="min-w-0"
              afterGiftVoucherChildren={
                <>
                  <VitanaIndexChip />
                  <AutopilotChip
                    pendingCount={pendingCount}
                    onClick={() => setAutopilotOpen(true)}
                  />
                </>
              }
            >
              <div className="flex items-center gap-2 min-w-max">
                <ExpandableSearchButton placeholder={translate('health.searchPlaceholder', 'Search reports, supplements...')} />
                <MobileModePill
                  modes={healthModes}
                  activeMode={mobileTab}
                  onModeChange={(v) => setMobileTab(v as any)}
                />
                <UniversalCalendarButton />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                  onClick={() => setUploadSheetOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">{translate('health.upload', 'Upload')}</span>
                </Button>
              </div>
            </UtilityActionButton>
          </div>

          {/* Content based on active mode */}
          {mobileTab === 'overview' && (
            <div className="flex-1 overflow-y-auto">
              <MobileHealthSnapshot
                vitanaIndex={vitanaScore}
                vitanaPercentile={15}
                trend="up"
                pillars={pillars}
              />
              <MobilePriorityFocus
                pillarName={getPillarLabel(weakestPillar[0])}
                pillarScore={weakestPillar[1]}
                pillarEmoji={pillarEmojis[weakestPillar[0]]}
                explanation={translate('health.priorityFocusExplanation')}
              />
              <MobileAutopilotGuidance
                suggestions={[
                  translate('health.suggestions.uploadBloodTestResults'),
                  translate('health.suggestions.startFitnessChallenge')
                ]}
                onTakeAction={() => setHealthActionsOpen(true)}
              />
            </div>
          )}

          {mobileTab === 'medical' && (
            <div className="flex-1 overflow-y-auto">
              <MobileHealthMedicalTab onUpload={() => setUploadSheetOpen(true)} />
            </div>
          )}

          {mobileTab === 'supplements' && (
            <div className="flex-1 overflow-y-auto">
              <MobileHealthSupplementsTab />
            </div>
          )}
        </div>
        
        <AutopilotPopup
          open={autopilotOpen}
          onOpenChange={setAutopilotOpen}
        />
        
        <HealthMasterActionPopup
          open={healthActionsOpen}
          onOpenChange={setHealthActionsOpen}
          onUploadOpen={() => setUploadSheetOpen(true)}
          onOrderOpen={() => setOrderSheetOpen(true)}
        />
        
        <HealthReportUploadSheet
          open={uploadSheetOpen}
          onOpenChange={setUploadSheetOpen}
        />
        
        <QuickLabOrderSheet
          open={orderSheetOpen}
          onOpenChange={setOrderSheetOpen}
        />
      </AppLayout>
    );
  }

  // Desktop layout (unchanged)
  return (
    <AppLayout>
      <SEO title="Health" description="Discover health services, programs, and educational resources" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Let's improve quality of life!"
            description="Discover health services, programs, and educational resources to enhance your wellness journey."
            emoji="🌱"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search health services, articles, or community..." />
            <UniversalCalendarButton />
            <Button
              variant="default"
              size="sm"
              onClick={() => setHealthActionsOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Health Actions
            </Button>
          </UtilityActionButton>

          {/* Three-Column Hero Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <CompactVitanaIndex 
              score={vitanaScore}
              trend="up"
              pillars={{
                nutrition: 85,
                hydration: 72,
                exercise: 68,
                sleep: 90,
                mental: 78
              }}
            />
            
            <MotivationalDataCard 
              userName={profile?.displayName || profile?.fullName?.split(' ')[0] || 'there'}
              dataCompleteness={45}
            />
            
            <NextBestActionCard 
              weakestPillar={{
                name: "Exercise",
                score: 68,
                icon: "🏃"
              }}
            />
          </div>

          {/* Actions Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Today's Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📋 Today's Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StackedCardList items={smartSuggestions.slice(0, 3).map((suggestion, index) => ({
                  id: `action-${index}`,
                  icon: suggestion.type === "action" ? Target : 
                        suggestion.type === "insight" ? Moon : 
                        Sparkles,
                  title: suggestion.title,
                  subtext: suggestion.description,
                  pill: {
                    label: suggestion.priority,
                    variant: suggestion.priority === "high" ? "destructive" : 
                            suggestion.priority === "medium" ? "secondary" : "success"
                  }
                }))} />
              </CardContent>
            </Card>

            {/* Upcoming Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📅 Upcoming Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: 'Annual Physical', date: 'Feb 15, 2025', type: 'Appointment' },
                    { title: 'Lab Results Review', date: 'Feb 18, 2025', type: 'Follow-up' },
                    { title: 'Wellness Check', date: 'Mar 01, 2025', type: 'Appointment' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.type}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{item.date}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Health Insights */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>AI Health Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <StackedCardList items={smartSuggestions.slice(3, 6).map((suggestion, index) => ({
                id: `insight-${index}`,
                icon: suggestion.type === "action" ? Target : 
                      suggestion.type === "insight" ? Moon : 
                      Sparkles,
                title: suggestion.title,
                subtext: suggestion.description,
                pill: {
                  label: suggestion.priority,
                  variant: suggestion.priority === "high" ? "destructive" : 
                          suggestion.priority === "medium" ? "secondary" : "success"
                }
              }))} />
            </CardContent>
          </Card>

          {/* Community Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👥 Community Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { user: 'Sarah M.', activity: 'completed 5K run', time: '2 hours ago' },
                  { user: 'Mike T.', activity: 'shared healthy recipe', time: '4 hours ago' },
                  { user: 'Lisa K.', activity: 'achieved sleep goal', time: '6 hours ago' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500" />
                    <div className="flex-1">
                      <div className="font-medium">{item.user} {item.activity}</div>
                      <div className="text-sm text-muted-foreground">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AutopilotPopup
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
      
      <HealthMasterActionPopup
        open={healthActionsOpen}
        onOpenChange={setHealthActionsOpen}
        onUploadOpen={() => setUploadSheetOpen(true)}
        onOrderOpen={() => setOrderSheetOpen(true)}
      />
      
      <HealthReportUploadSheet
        open={uploadSheetOpen}
        onOpenChange={setUploadSheetOpen}
      />
      
      <QuickLabOrderSheet
        open={orderSheetOpen}
        onOpenChange={setOrderSheetOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.HEALTH_OVERVIEW);