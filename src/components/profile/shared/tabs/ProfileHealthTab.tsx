import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Moon, Apple, Droplets, Zap, Settings, Share2, Trophy, TrendingUp, Users } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { t } from '@/lib/i18n-toast';

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
      icon: <Moon className="h-5 w-5" />,
      trend: '+5%',
      accentColor: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/30 dark:to-purple-950/20',
      borderColor: 'border-indigo-200/50 dark:border-indigo-800/30'
    },
    { 
      label: 'Exercise', 
      value: 92, 
      icon: <Activity className="h-5 w-5" />,
      trend: '+12%',
      accentColor: 'from-orange-500 to-rose-500',
      bgGradient: 'from-orange-50/50 to-rose-50/30 dark:from-orange-950/30 dark:to-rose-950/20',
      borderColor: 'border-orange-200/50 dark:border-orange-800/30'
    },
    { 
      label: 'Nutrition', 
      value: 78, 
      icon: <Apple className="h-5 w-5" />,
      trend: '+3%',
      accentColor: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50/50 to-emerald-50/30 dark:from-green-950/30 dark:to-emerald-950/20',
      borderColor: 'border-green-200/50 dark:border-green-800/30'
    },
    { 
      label: 'Hydration', 
      value: 88, 
      icon: <Droplets className="h-5 w-5" />,
      trend: '+8%',
      accentColor: 'from-cyan-500 to-teal-500',
      bgGradient: 'from-cyan-50/50 to-teal-50/30 dark:from-cyan-950/30 dark:to-teal-950/20',
      borderColor: 'border-cyan-200/50 dark:border-cyan-800/30'
    },
    { 
      label: 'Heart Health', 
      value: 91, 
      icon: <Heart className="h-5 w-5" />,
      trend: '+2%',
      accentColor: 'from-rose-500 to-pink-500',
      bgGradient: 'from-rose-50/50 to-pink-50/30 dark:from-rose-950/30 dark:to-pink-950/20',
      borderColor: 'border-rose-200/50 dark:border-rose-800/30'
    },
    { 
      label: 'Energy', 
      value: 83, 
      icon: <Zap className="h-5 w-5" />,
      trend: '+7%',
      accentColor: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-50/50 to-amber-50/30 dark:from-yellow-950/30 dark:to-amber-950/20',
      borderColor: 'border-yellow-200/50 dark:border-yellow-800/30'
    }
  ];

  const getScoreGradient = (value: number) => {
    if (value >= 90) return 'from-emerald-500 to-green-500';
    if (value >= 70) return 'from-yellow-500 to-amber-500';
    return 'from-rose-500 to-red-500';
  };

  return (
    <div className="w-full space-y-6 animate-fade-in bg-gradient-to-b from-white to-emerald-50/60 dark:from-slate-900 dark:to-emerald-950 rounded-2xl p-6">
      {/* Privacy Settings */}
      {editMode && onEditVisibility && (
        <Card className="p-6 border border-dashed border-muted-foreground/20 rounded-2xl shadow-sm bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('screens.profile.privacyVisibility')}</h3>
              <p className="text-muted-foreground text-sm">
                Control who can see your health data and profile information
              </p>
            </div>
            <Button variant="outline" onClick={onEditVisibility} className="rounded-full shadow-sm">
              <Settings className="h-4 w-4 mr-2" />
              Privacy Settings
            </Button>
          </div>
        </Card>
      )}

      {/* Overall Health Score - Centered Focus Element */}
      {profile.vitanaIndex && (
        <Card className="relative overflow-hidden rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-0 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30">
          {/* Radial glow background */}
          <div className="absolute inset-0 bg-gradient-radial from-emerald-200/30 via-transparent to-transparent dark:from-emerald-600/20" />
          
          <CardContent className="relative py-12 px-8">
            {/* Centered glowing score */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center gap-3 mb-3">
                <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-semibold text-foreground">{t('screens.profile.overallHealthScore')}</h3>
              </div>
              
              {/* Animated glowing number */}
              <div className="relative inline-block">
                <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-emerald-500/40 to-teal-500/40 rounded-full animate-pulse" />
                <div className="relative text-7xl font-bold bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent animate-fade-in">
                  {profile.vitanaIndex}
                </div>
              </div>
              
              {profile.vitanaPercentile && (
                <Badge className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 rounded-full px-4 py-1.5 shadow-lg">
                  <Trophy className="h-3.5 w-3.5 mr-1.5" />
                  Top {100 - profile.vitanaPercentile}%
                </Badge>
              )}
            </div>

            {/* Rounded gradient progress */}
            <div className="max-w-md mx-auto mb-6">
              <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{ width: `${profile.vitanaIndex / 10}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Your overall health and wellness score based on all tracked metrics
              </p>
            </div>

            {/* Community Comparison - Compact */}
            <div className="max-w-xl mx-auto mt-8 p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-muted/30 shadow-sm">
              <h4 className="font-medium text-sm flex items-center justify-center gap-2 mb-4 text-muted-foreground">
                <Users className="h-4 w-4" />
                Your Wellness Sync
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('screens.profile.ageGroup')}</div>
                  <Badge variant="secondary" className="text-xs rounded-full">{t('screens.profile.text15Avg')}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('screens.profile.similarGoals')}</div>
                  <Badge variant="secondary" className="text-xs rounded-full">{t('screens.profile.top12')}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('screens.profile.activityLevel')}</div>
                  <Badge variant="secondary" className="text-xs rounded-full">{t('screens.profile.aboveAvg')}</Badge>
                </div>
              </div>
            </div>

            {/* Latest Achievement */}
            <div className="max-w-xl mx-auto mt-6 p-4 rounded-2xl bg-gradient-to-r from-violet-50/80 to-purple-50/80 dark:from-violet-950/40 dark:to-purple-950/40 border border-violet-200/40 dark:border-violet-800/30 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm text-foreground">{t('screens.profile.latestAchievement')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('screens.profile.text30dayWellnessStreakCompleted')}</div>
                </div>
                <Button size="sm" variant="ghost" className="gap-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50">
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Metrics Grid - Category-hued Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {healthMetrics.map((metric, index) => (
          <Card 
            key={index} 
            className={`overflow-hidden rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 border ${metric.borderColor} bg-gradient-to-br ${metric.bgGradient}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${metric.accentColor} text-white shadow-md`}>
                    {metric.icon}
                  </div>
                  <span className="font-semibold text-foreground">{metric.label}</span>
                </div>
                <Badge variant="outline" className="text-xs rounded-full border-current/30 bg-white/60 dark:bg-slate-900/60">
                  {metric.trend}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-3xl font-bold bg-gradient-to-r ${metric.accentColor} bg-clip-text text-transparent`}>
                    {metric.value}%
                  </span>
                </div>
                
                {/* Rounded gradient progress bar */}
                <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full bg-gradient-to-r ${metric.accentColor} rounded-full transition-all duration-500 shadow-sm`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                
                <div className="text-xs text-muted-foreground pt-1">
                  Goal: 90% · Streak: {Math.floor(Math.random() * 15 + 5)} days
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Health Insights - Colorful Pills */}
      <Card className="rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] border-muted/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">{t('screens.profile.recentHealthInsights')}</span>
            <Badge variant="outline" className="text-xs rounded-full border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40">
              <TrendingUp className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
              Improving
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {/* Progress Visualizations */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-br from-indigo-50/80 to-purple-50/60 dark:from-indigo-950/40 dark:to-purple-950/30 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold text-sm text-foreground">{t('screens.profile.sleepConsistency')}</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{t('screens.profile.text21Days')}</div>
                <div className="text-xs text-muted-foreground mb-3">{t('screens.profile.currentStreak')}</div>
                <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              
              <div className="p-5 rounded-2xl border border-orange-200/50 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/80 to-rose-50/60 dark:from-orange-950/40 dark:to-rose-950/30 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="font-semibold text-sm text-foreground">{t('screens.profile.workoutGoals')}</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 dark:from-orange-400 dark:to-rose-400 bg-clip-text text-transparent">4/5</div>
                <div className="text-xs text-muted-foreground mb-3">{t('screens.profile.thisWeek')}</div>
                <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
            
            {/* Insight Pills with Emojis */}
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-gradient-to-br from-orange-50/90 to-rose-50/80 dark:from-orange-950/50 dark:to-rose-950/40 rounded-2xl border border-orange-200/50 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="text-lg mr-2">🎉</span>
                  <strong className="text-orange-700 dark:text-orange-400">{t('screens.profile.greatProgress')}</strong> Your exercise consistency has improved by 12% this month.
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50/90 to-purple-50/80 dark:from-indigo-950/50 dark:to-purple-950/40 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="text-lg mr-2">😴</span>
                  <strong className="text-indigo-700 dark:text-indigo-400">{t('screens.profile.sleepQuality')}</strong> You're averaging 7.5 hours of quality sleep. Keep it up!
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50/90 to-emerald-50/80 dark:from-green-950/50 dark:to-emerald-950/40 rounded-2xl border border-green-200/50 dark:border-green-800/30 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="text-lg mr-2">🥗</span>
                  <strong className="text-green-700 dark:text-green-400">{t('screens.profile.nutritionTip')}</strong> Consider adding more leafy greens to boost your nutrition score.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}