import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Moon, Apple, Droplets, Zap, Settings, Share2, Trophy, TrendingUp, Users } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfileHealthTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditVisibility?: () => void;
}

export function ProfileHealthTab({ profile, scope, editMode, onEditVisibility }: ProfileHealthTabProps) {
  // Mock health data - replace with real data
  const healthMetrics = [
    { 
      label: 'Sleep Quality', 
      value: 85, 
      icon: <Moon className="h-5 w-5 text-[hsl(var(--pill-sleep-accent))]" />,
      trend: '+5%'
    },
    { 
      label: 'Exercise', 
      value: 92, 
      icon: <Activity className="h-5 w-5 text-[hsl(var(--pill-fitness-accent))]" />,
      trend: '+12%'
    },
    { 
      label: 'Nutrition', 
      value: 78, 
      icon: <Apple className="h-5 w-5 text-[hsl(var(--pill-nutrition-accent))]" />,
      trend: '+3%'
    },
    { 
      label: 'Hydration', 
      value: 88, 
      icon: <Droplets className="h-5 w-5 text-[hsl(var(--pill-hydration-accent))]" />,
      trend: '+8%'
    },
    { 
      label: 'Heart Health', 
      value: 91, 
      icon: <Heart className="h-5 w-5 text-[hsl(var(--domain-community-accent))]" />,
      trend: '+2%'
    },
    { 
      label: 'Energy', 
      value: 83, 
      icon: <Zap className="h-5 w-5 text-[hsl(var(--pill-mental-accent))]" />,
      trend: '+7%'
    }
  ];

  const getScoreColor = (value: number) => {
    if (value >= 90) return 'text-[hsl(var(--pill-mental-accent))]';
    if (value >= 70) return 'text-[hsl(var(--pill-nutrition-accent))]';
    return 'text-[hsl(var(--domain-community-accent))]';
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Privacy Settings */}
      {editMode && onEditVisibility && (
        <Card className="p-6 border-2 border-dashed border-muted-foreground/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Privacy & Visibility</h3>
              <p className="text-muted-foreground">
                Control who can see your health data and profile information
              </p>
            </div>
            <Button variant="outline" onClick={onEditVisibility}>
              <Settings className="h-4 w-4 mr-2" />
              Privacy Settings
            </Button>
          </div>
        </Card>
      )}

      {/* Vitana Index Card with Enhanced Features */}
      {profile.vitanaIndex && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sys-vitana-accent)/0.1)] to-[hsl(var(--domain-community-accent)/0.1)]" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Overall Health Score
              </div>
              <Button size="sm" variant="outline" className="gap-2">
                <Share2 className="h-3 w-3" />
                Share Progress
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl font-bold text-[hsl(var(--sys-vitana-accent))]">
                    {profile.vitanaIndex}
                  </div>
                  {profile.vitanaPercentile && (
                    <Badge className="bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--domain-community-accent))] text-white border-0">
                      <Trophy className="h-3 w-3 mr-1" />
                      Top {100 - profile.vitanaPercentile}%
                    </Badge>
                  )}
                </div>
                <Progress value={profile.vitanaIndex / 10} className="h-3 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Your overall health and wellness score based on all tracked metrics.
                </p>
              </div>
              
              {/* Anonymous Benchmarking */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Community Comparison
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">vs. Your age group (25-35)</span>
                    <Badge variant="secondary" className="text-xs">+15 above average</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">vs. Similar goals</span>
                    <Badge variant="secondary" className="text-xs">Top 12%</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">vs. Activity level</span>
                    <Badge variant="secondary" className="text-xs">Above average</Badge>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Milestone Achievement */}
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-[hsl(var(--pill-mental-accent)/0.1)] to-[hsl(var(--pill-nutrition-accent)/0.1)] border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Latest Achievement</div>
                  <div className="text-xs text-muted-foreground">30-day wellness streak completed!</div>
                </div>
                <Button size="sm" variant="ghost" className="gap-2">
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Metrics Grid with Enhanced Colors */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {healthMetrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {metric.icon}
                  <span className="font-medium">{metric.label}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {metric.trend}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>
                    {metric.value}%
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
                <Progress 
                  value={metric.value} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  Goal: 90% • Current streak: {Math.floor(Math.random() * 15 + 5)} days
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health Insights with Progress Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Health Insights
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Improving
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Visualizations */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg border bg-gradient-to-r from-background to-[hsl(var(--pill-sleep-accent)/0.1)]">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4 text-[hsl(var(--pill-sleep-accent))]" />
                  <span className="font-medium text-sm">Sleep Consistency</span>
                </div>
                <div className="text-2xl font-bold text-[hsl(var(--pill-sleep-accent))]">21 days</div>
                <div className="text-xs text-muted-foreground">Current streak</div>
                <Progress value={70} className="h-2 mt-2" />
              </div>
              
              <div className="p-4 rounded-lg border bg-gradient-to-r from-background to-[hsl(var(--pill-fitness-accent)/0.1)]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-[hsl(var(--pill-fitness-accent))]" />
                  <span className="font-medium text-sm">Workout Goals</span>
                </div>
                <div className="text-2xl font-bold text-[hsl(var(--pill-fitness-accent))]">4/5</div>
                <div className="text-xs text-muted-foreground">This week</div>
                <Progress value={80} className="h-2 mt-2" />
              </div>
            </div>
            
            {/* Insights */}
            <div className="space-y-3">
              <div className="p-3 bg-[hsl(var(--pill-mental-accent)/0.1)] rounded-lg border border-[hsl(var(--pill-mental-accent)/0.2)]">
                <p className="text-sm text-foreground">
                  <strong>Great progress!</strong> Your exercise consistency has improved by 12% this month.
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--pill-sleep-accent)/0.1)] rounded-lg border border-[hsl(var(--pill-sleep-accent)/0.2)]">
                <p className="text-sm text-foreground">
                  <strong>Sleep quality:</strong> You're averaging 7.5 hours of quality sleep. Keep it up!
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--pill-nutrition-accent)/0.1)] rounded-lg border border-[hsl(var(--pill-nutrition-accent)/0.2)]">
                <p className="text-sm text-foreground">
                  <strong>Nutrition tip:</strong> Consider adding more leafy greens to boost your nutrition score.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}