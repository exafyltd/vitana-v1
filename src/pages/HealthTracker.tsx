import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { TrackerInsightsSplitScreen } from "@/components/ui/split-screen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Smartphone, Calendar, TrendingUp, Droplets, Apple, Dumbbell, Moon, Brain, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { Progress } from "@/components/ui/progress";
import { healthNavigation } from "@/config/navigation";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { t } from '@/lib/i18n-toast';


const overviewCards = [
  {
    title: "My Vitana Index",
    description: "Detailed health score breakdown with biomarkers & genomics",
    icon: Activity,
    path: "/health/my-health-tracker",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Connected Devices & Apps",
    description: "Sync wearables, IoT devices & health apps",
    icon: Smartphone,
    path: "/health/my-health-tracker",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Daily & Weekly Tracking",
    description: "Log hydration, nutrition, activity, sleep & mental wellbeing",
    icon: Calendar,
    path: "/health/my-health-tracker",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Progress & Goals",
    description: "Track goals, AI insights, reports & historical data",
    icon: TrendingUp,
    path: "/health/my-health-tracker",
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Biomarker Analysis",
    description: "Review lab test results and track biomarker trends",
    icon: FileText,
    path: "/health/my-health-tracker",
    color: "from-emerald-500/20 to-teal-500/20",
  },
];

export default function HealthTracker() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("nutrition");
  const { index: vitanaIndex, isLoading: vitanaIndexLoading } = useVitanaIndex();
  const vitanaIndexValue = vitanaIndex?.total ?? 0;
  const vitanaIndexDisplay = vitanaIndexLoading || !vitanaIndex ? "…" : vitanaIndexValue.toString();

  useEffect(() => {
    console.log("HealthTracker page using healthNavigation:", healthNavigation);
    console.log("Current path:", window.location.pathname);
  }, []);

  const pillarData = [
    { name: "Hydration", score: 85, icon: Droplets, color: "text-blue-500", progress: 85 },
    { name: "Nutrition", score: 72, icon: Apple, color: "text-green-500", progress: 72 },
    { name: "Exercise", score: 68, icon: Dumbbell, color: "text-orange-500", progress: 68 },
    { name: "Sleep", score: 81, icon: Moon, color: "text-purple-500", progress: 81 },
    { name: "Mental", score: 77, icon: Brain, color: "text-pink-500", progress: 77 }
  ];

  const trackerInsights = [
    {
      title: "Missing Sleep Data",
      description: "No sleep logged for 2 days. Connect your wearable or log manually.",
      type: "alert" as const,
      priority: "high" as const,
      action: "Log Sleep"
    },
    {
      title: "Hydration Pattern Detected",
      description: "You drink 40% less water on weekends. Set weekend reminders?",
      type: "insight" as const,
      priority: "medium" as const,
      action: "Set Reminders"
    },
    {
      title: "Exercise Streak: 7 Days!",
      description: "Great job! Your consistency is improving your overall score.",
      type: "recommendation" as const,
      priority: "low" as const,
      action: "Share Achievement"
    }
  ];

  const autopilotSuggestions = [
    "Auto-sync missing fitness data from Apple Health",
    "Log water intake based on your routine patterns",
    "Schedule rest day - you've been consistent for 7 days"
  ];

  return (
    <AppLayout>
      <SEO title={t('screens.healthtracker.healthTracker')} description="Track your personal health data and monitor wellness progress" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Shortened Header Bar - Welcome Message Only */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('screens.healthtracker.letSTrackYourProgressTogether')}</h1>
                <p className="text-muted-foreground">{t('screens.healthtracker.monitorYourPersonalHealthDataTrack')}</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health/my-health-tracker')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">{vitanaIndexDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pillars Overview with Gamification */}
          <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-calendar-primary" />
                Health Pillars Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {pillarData.map((pillar) => (
                  <div key={pillar.name} className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-calendar-primary/10 to-calendar-secondary/10 flex items-center justify-center">
                      <pillar.icon className={`w-6 h-6 ${pillar.color}`} />
                    </div>
                    <h3 className="font-medium text-foreground">{pillar.name}</h3>
                    <div className="space-y-1">
                      <Progress value={pillar.progress} className="h-2" />
                      <span className="text-sm font-bold text-foreground">{pillar.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Intelligent Insights & Autopilot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SmartSuggestions 
                suggestions={trackerInsights}
                title={t('screens.healthtracker.trackingInsightsPatterns')}
                variant="list"
              />
            </div>
            <div>
              <AutopilotWidget 
                sectionName="Health Tracker"
                suggestions={autopilotSuggestions}
                isEnabled={true}
                variant="card"
              />
            </div>
          </div>

          {/* Health Tracker Split-Screen Layout */}
          <TrackerInsightsSplitScreen
            leftTitle="Health Tracking Categories"
            rightTitle={activePanel === "nutrition" ? "Nutrition Tracking" :
                        activePanel === "sleep" ? "Sleep Tracking" :
                        activePanel === "exercise" ? "Exercise Tracking" :
                        activePanel === "mental" ? "Mental Wellness" : "Vitana Index"}
            leftContent={
              <div className="space-y-2">
                <Button
                  variant={activePanel === "nutrition" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActivePanel("nutrition")}
                >
                  <Apple className="w-4 h-4 mr-2" />
                  Nutrition
                </Button>
                <Button
                  variant={activePanel === "sleep" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActivePanel("sleep")}
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Sleep
                </Button>
                <Button
                  variant={activePanel === "exercise" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActivePanel("exercise")}
                >
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Exercise
                </Button>
                <Button
                  variant={activePanel === "mental" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActivePanel("mental")}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Mental
                </Button>
                <Button
                  variant={activePanel === "index" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActivePanel("index")}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Vitana Index
                </Button>
              </div>
            }
            rightContent={
              <div className="space-y-4">
                {activePanel === "nutrition" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Apple className="w-5 h-5 text-green-500" />
                            Daily Nutrition
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Calories</span>
                              <span>1,847 / 2,200</span>
                            </div>
                            <Progress value={84} className="h-2" />
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>{t('screens.healthtracker.protein127g')}</div>
                              <div>{t('screens.healthtracker.carbs203g')}</div>
                              <div>{t('screens.healthtracker.fat67g')}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{t('screens.healthtracker.quickLog')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline">Breakfast</Button>
                            <Button size="sm" variant="outline">Lunch</Button>
                            <Button size="sm" variant="outline">Dinner</Button>
                            <Button size="sm" variant="outline">Snack</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {activePanel === "sleep" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Moon className="w-5 h-5 text-purple-500" />
                            Sleep Quality
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center space-y-2">
                            <div className="text-3xl font-bold text-purple-500">7.5h</div>
                            <p className="text-sm text-muted-foreground">{t('screens.healthtracker.lastNight')}</p>
                            <Progress value={81} className="h-2" />
                            <div className="text-xs text-muted-foreground">{t('screens.healthtracker.sleepScore81100')}</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{t('screens.healthtracker.sleepPattern')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.bedtimeAvg')}</span>
                              <span>{t('screens.healthtracker.text1030Pm')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.wakeTimeAvg')}</span>
                              <span>{t('screens.healthtracker.text615Am')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.deepSleep')}</span>
                              <span>23%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {activePanel === "exercise" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Dumbbell className="w-5 h-5 text-orange-500" />
                            Weekly Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>{t('screens.healthtracker.activeDays')}</span>
                              <span>{t('screens.healthtracker.text45Goal')}</span>
                            </div>
                            <Progress value={80} className="h-2" />
                            <div className="text-xs text-muted-foreground">{t('screens.healthtracker.text68ImprovementFromLastWeek')}</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{t('screens.healthtracker.todaySActivity')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.steps')}</span>
                              <span>8,247 / 10,000</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.activeMinutes')}</span>
                              <span>34 / 60</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.caloriesBurned')}</span>
                              <span>247</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {activePanel === "mental" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-pink-500" />
                            Mental Wellness
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>{t('screens.healthtracker.moodScore')}</span>
                              <span>7.2/10</span>
                            </div>
                            <Progress value={72} className="h-2" />
                            <div className="text-xs text-muted-foreground">{t('screens.healthtracker.stressLevelModerate')}</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Mindfulness</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.meditationStreak')}</span>
                              <span>{t('screens.healthtracker.text3Days')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('screens.healthtracker.todaySSession')}</span>
                              <span>{t('screens.healthtracker.text12Min')}</span>
                            </div>
                            <Button size="sm" className="w-full mt-2">{t('screens.healthtracker.startSession')}</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {activePanel === "index" && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-green-500" />
                          Vitana Index Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center space-x-8 mb-6">
                          <div className="text-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg">
                              <span className="text-2xl font-bold text-green-600">{vitanaIndexDisplay}</span>
                            </div>
                            <div className="mt-2 text-sm font-medium">{t('screens.healthtracker.yourIndex')}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-4 mt-6">
                          {pillarData.map((pillar) => (
                            <div key={pillar.name} className="text-center space-y-2">
                              <pillar.icon className={`w-6 h-6 mx-auto ${pillar.color}`} />
                              <div className="text-xs font-medium">{pillar.name}</div>
                              <div className="text-sm font-bold">{pillar.score}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            }
            screenId="health-tracker"
          />
        </div>
      </div>
    </AppLayout>
  );
}