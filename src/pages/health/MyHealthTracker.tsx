import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Apple, Droplets, Dumbbell, Moon, Brain, FileText, Plus, TrendingUp, Calendar, Target } from "lucide-react";
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
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Track your Vitana Index journey! 📊"
            description="Monitor your health pillars and lab results to optimize your wellness score."
            emoji="📈"
          />

          {/* Main Split Screen Navigation */}
          <Tabs defaultValue="pillars" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pillars" className="text-lg font-medium">5 Pillars of Health</TabsTrigger>
              <TabsTrigger value="lab-results" className="text-lg font-medium">Lab Results</TabsTrigger>
            </TabsList>

            {/* 5 Pillars of Health Tab */}
            <TabsContent value="pillars" className="space-y-6">
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
            </TabsContent>

            {/* Lab Results Tab */}
            <TabsContent value="lab-results" className="space-y-6">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}