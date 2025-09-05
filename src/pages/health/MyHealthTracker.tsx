import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Activity, Apple, Droplets, Dumbbell, Moon, Brain, FileText, Plus, TrendingUp, Calendar, Target, BarChart3, Trophy, Zap, Clock, Star } from "lucide-react";
import { healthNavigation } from "@/config/navigation";
import { useState } from "react";

export default function MyHealthTracker() {
  const [selectedPillar, setSelectedPillar] = useState("nutrition");

  const pillarData = [
    { 
      id: "nutrition", 
      name: "Nutrition", 
      score: 72, 
      icon: Apple, 
      color: "text-green-500",
      bgColor: "bg-green-50",
      progress: 72,
      impact: "+15 points to Vitana Index",
      lastTracked: "2 hours ago",
      tags: ["Mediterranean Diet", "Low Carb", "Plant-Based", "Organic"]
    },
    { 
      id: "hydration", 
      name: "Hydration", 
      score: 85, 
      icon: Droplets, 
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      progress: 85,
      impact: "+8 points to Vitana Index",
      lastTracked: "30 minutes ago",
      tags: ["Water", "Electrolytes", "Herbal Tea", "Coconut Water"]
    },
    { 
      id: "exercise", 
      name: "Exercise", 
      score: 68, 
      icon: Dumbbell, 
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      progress: 68,
      impact: "+12 points to Vitana Index",
      lastTracked: "1 day ago",
      tags: ["Cardio", "Strength Training", "Yoga", "HIIT", "Walking"]
    },
    { 
      id: "sleep", 
      name: "Sleep", 
      score: 81, 
      icon: Moon, 
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      progress: 81,
      impact: "+18 points to Vitana Index",
      lastTracked: "8 hours ago",
      tags: ["Deep Sleep", "REM", "Sleep Hygiene", "Recovery"]
    },
    { 
      id: "mental", 
      name: "Mental Health", 
      score: 77, 
      icon: Brain, 
      color: "text-pink-500",
      bgColor: "bg-pink-50",
      progress: 77,
      impact: "+10 points to Vitana Index",
      lastTracked: "3 hours ago",
      tags: ["Meditation", "Stress Management", "Mindfulness", "Gratitude"]
    }
  ];

  const labResults = [
    {
      test: "Complete Blood Count",
      date: "March 15, 2024",
      status: "Normal",
      impact: "Supports overall Vitana Index stability",
      key_markers: ["Hemoglobin", "White Blood Cells", "Platelets"]
    },
    {
      test: "Lipid Panel",
      date: "March 10, 2024", 
      status: "Optimal",
      impact: "+5 points to cardiovascular health score",
      key_markers: ["Total Cholesterol", "HDL", "LDL", "Triglycerides"]
    },
    {
      test: "Vitamin D",
      date: "March 8, 2024",
      status: "Insufficient", 
      impact: "-3 points from Vitana Index",
      key_markers: ["25-Hydroxyvitamin D"]
    },
    {
      test: "Thyroid Panel",
      date: "February 28, 2024",
      status: "Normal",
      impact: "Neutral impact on metabolic score",
      key_markers: ["TSH", "T3", "T4"]
    }
  ];

  const selectedPillarData = pillarData.find(p => p.id === selectedPillar);
  const overallScore = Math.round(pillarData.reduce((acc, p) => acc + p.score, 0) / pillarData.length);

  return (
    <AppLayout>
      <SEO title="My Health Tracker | Health" description="Track your health metrics and monitor your Vitana Index progress" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Track your Vitana Index journey!"
            description="Monitor your health pillars and lab results to optimize your wellness score."
            emoji="📊"
          />

          <SplitBar defaultValue="pillars" className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="pillars">5 Pillars of Health</SplitBarTrigger>
              <SplitBarTrigger value="progress-goals">Progress & Goals</SplitBarTrigger>
              <SplitBarTrigger value="lab-results">Lab Results</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="pillars" className="space-y-6">
              {/* Vitana Index Overview */}
              <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-calendar-primary" />
                    Current Vitana Index Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-calendar-primary">742</div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>5 Pillars Average</span>
                        <span className="font-medium">{overallScore}%</span>
                      </div>
                      <Progress value={overallScore} className="h-3" />
                      <div className="text-xs text-muted-foreground">
                        Based on your tracking across all health pillars
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Split Screen: Pillar Selection + Detailed View */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Pillar Navigation */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Health Pillars</CardTitle>
                    <CardDescription>Select a pillar to track and tag</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pillarData.map((pillar) => (
                      <div
                        key={pillar.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedPillar === pillar.id 
                            ? `${pillar.bgColor} border-2 border-current shadow-md` 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        onClick={() => setSelectedPillar(pillar.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${pillar.bgColor} flex items-center justify-center`}>
                            <pillar.icon className={`w-5 h-5 ${pillar.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{pillar.name}</div>
                            <div className="flex items-center gap-2">
                              <Progress value={pillar.progress} className="flex-1 h-2" />
                              <span className="text-sm font-bold">{pillar.score}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Right: Detailed Pillar View with Tracking */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedPillarData && <selectedPillarData.icon className={`w-5 h-5 ${selectedPillarData.color}`} />}
                      {selectedPillarData?.name} Tracking
                    </CardTitle>
                    <CardDescription>
                      Last tracked: {selectedPillarData?.lastTracked} • {selectedPillarData?.impact}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-foreground">{selectedPillarData?.score}</div>
                        <div className="text-sm text-muted-foreground">Current Score</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-calendar-primary">+{Math.floor(Math.random() * 5) + 1}</div>
                        <div className="text-sm text-muted-foreground">7-day Trend</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-calendar-accent">{Math.floor(Math.random() * 10) + 15}</div>
                        <div className="text-sm text-muted-foreground">Days Tracked</div>
                      </div>
                    </div>

                    {/* Tags & Quick Actions */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Tags & Categories</h4>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Tag
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedPillarData?.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Quick Log Actions */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Quick Log</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">Log Entry</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs">Track Metric</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
                          <Target className="w-4 h-4" />
                          <span className="text-xs">Set Goal</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
                          <Plus className="w-4 h-4" />
                          <span className="text-xs">Add Note</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            {/* Progress & Goals Tab */}
            <SplitBarContent value="progress-goals" className="space-y-6">
              {/* Goals Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="w-5 h-5 text-calendar-primary" />
                      Active Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-calendar-primary">5</div>
                      <div className="text-sm text-muted-foreground">Goals in progress</div>
                      <Progress value={68} className="h-2" />
                      <div className="text-xs text-muted-foreground">68% average completion</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-calendar-accent/5 to-calendar-secondary/5 border-calendar-accent/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="w-5 h-5 text-calendar-accent" />
                      Weekly Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-calendar-accent">+12%</div>
                      <div className="text-sm text-muted-foreground">This week vs last</div>
                      <div className="flex justify-center gap-1">
                        {[85, 72, 90, 68, 78, 82, 75].map((value, i) => (
                          <div key={i} className="w-2 bg-calendar-accent/30 rounded-sm" style={{height: `${value/4}px`}} />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="w-5 h-5 text-purple-500" />
                      Streak Record
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-purple-500">28</div>
                      <div className="text-sm text-muted-foreground">Days longest streak</div>
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Current: 7 days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Goals */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Current Goals</CardTitle>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      New Goal
                    </Button>
                  </div>
                  <CardDescription>Track your wellness objectives and milestones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { title: "Daily Hydration Target", target: "3L water daily", progress: 85, icon: Droplets, color: "text-blue-500", bgColor: "bg-blue-50" },
                      { title: "Weekly Exercise Goal", target: "5 workouts/week", progress: 60, icon: Dumbbell, color: "text-orange-500", bgColor: "bg-orange-50" },
                      { title: "Sleep Quality", target: "8+ hours nightly", progress: 75, icon: Moon, color: "text-purple-500", bgColor: "bg-purple-50" },
                      { title: "Mindfulness Practice", target: "15 min meditation", progress: 45, icon: Brain, color: "text-pink-500", bgColor: "bg-pink-50" },
                      { title: "Nutrition Score", target: "80+ daily score", progress: 70, icon: Apple, color: "text-green-500", bgColor: "bg-green-50" }
                    ].map((goal, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all">
                        <div className={`w-12 h-12 rounded-lg ${goal.bgColor} flex items-center justify-center`}>
                          <goal.icon className={`w-6 h-6 ${goal.color}`} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{goal.title}</div>
                            <div className="text-sm text-muted-foreground">{goal.progress}%</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{goal.target}</div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                        <Button variant="ghost" size="sm">
                          <Target className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights & Recommendations */}
              <Card className="bg-gradient-to-br from-calendar-secondary/5 to-calendar-accent/5 border-calendar-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-calendar-secondary" />
                    AI Insights & Smart Recommendations
                  </CardTitle>
                  <CardDescription>Personalized insights based on your tracking patterns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-calendar-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-calendar-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">Hydration Pattern</div>
                          <div className="text-xs text-muted-foreground">You tend to drink more water on workout days. Consider setting hydration reminders for rest days.</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-calendar-accent/10 flex items-center justify-center">
                          <Moon className="w-4 h-4 text-calendar-accent" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">Sleep Optimization</div>
                          <div className="text-xs text-muted-foreground">Your best sleep quality occurs when you exercise 4-6 hours before bedtime.</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-background/50 border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Apple className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">Nutrition Timing</div>
                          <div className="text-xs text-muted-foreground">Your energy levels peak when you eat protein-rich breakfasts. Consider meal prep.</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-background/50 border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <Brain className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">Stress Correlation</div>
                          <div className="text-xs text-muted-foreground">Meditation sessions correlate with improved sleep quality the same night.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            {/* Lab Results Tab */}
            <SplitBarContent value="lab-results" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {labResults.map((result, index) => (
                  <Card key={index} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-calendar-primary" />
                        {result.test}
                      </CardTitle>
                      <CardDescription>{result.date}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge 
                          variant={result.status === "Normal" || result.status === "Optimal" ? "default" : "destructive"}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Vitana Index Impact:</div>
                        <div className="text-sm text-muted-foreground">{result.impact}</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Key Markers:</div>
                        <div className="flex flex-wrap gap-1">
                          {result.key_markers.map((marker) => (
                            <Badge key={marker} variant="outline" className="text-xs">
                              {marker}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full">
                        View Detailed Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Lab Tracking Summary */}
              <Card className="bg-gradient-to-br from-calendar-secondary/5 to-calendar-accent/5 border-calendar-secondary/20">
                <CardHeader>
                  <CardTitle>Lab Results Summary</CardTitle>
                  <CardDescription>How your lab work impacts your Vitana Index</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-background/50">
                      <div className="text-2xl font-bold text-green-600">3</div>
                      <div className="text-sm text-muted-foreground">Optimal Results</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background/50">
                      <div className="text-2xl font-bold text-orange-600">1</div>
                      <div className="text-sm text-muted-foreground">Needs Attention</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background/50">
                      <div className="text-2xl font-bold text-calendar-primary">+20</div>
                      <div className="text-sm text-muted-foreground">Net Vitana Impact</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </AppLayout>
  );
}