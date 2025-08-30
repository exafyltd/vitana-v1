import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Moon, Apple, Droplets, Zap } from "lucide-react";
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
      icon: <Moon className="h-5 w-5 text-blue-600" />,
      trend: '+5%'
    },
    { 
      label: 'Exercise', 
      value: 92, 
      icon: <Activity className="h-5 w-5 text-green-600" />,
      trend: '+12%'
    },
    { 
      label: 'Nutrition', 
      value: 78, 
      icon: <Apple className="h-5 w-5 text-orange-600" />,
      trend: '+3%'
    },
    { 
      label: 'Hydration', 
      value: 88, 
      icon: <Droplets className="h-5 w-5 text-cyan-600" />,
      trend: '+8%'
    },
    { 
      label: 'Heart Health', 
      value: 91, 
      icon: <Heart className="h-5 w-5 text-red-600" />,
      trend: '+2%'
    },
    { 
      label: 'Energy', 
      value: 83, 
      icon: <Zap className="h-5 w-5 text-yellow-600" />,
      trend: '+7%'
    }
  ];

  const getScoreColor = (value: number) => {
    if (value >= 90) return 'text-green-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Vitana Index Card */}
      {profile.vitanaIndex && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Overall Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl font-bold text-primary">
                {profile.vitanaIndex}
              </div>
              {profile.vitanaPercentile && (
                <Badge variant="secondary">
                  Top {100 - profile.vitanaPercentile}%
                </Badge>
              )}
            </div>
            <Progress value={profile.vitanaIndex / 10} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              Your overall health and wellness score based on all tracked metrics.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Health Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {healthMetrics.map((metric, index) => (
          <Card key={index}>
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
                </div>
                <Progress 
                  value={metric.value} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Health Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Great progress!</strong> Your exercise consistency has improved by 12% this month.
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Sleep quality:</strong> You're averaging 7.5 hours of quality sleep. Keep it up!
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                <strong>Nutrition tip:</strong> Consider adding more leafy greens to boost your nutrition score.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}