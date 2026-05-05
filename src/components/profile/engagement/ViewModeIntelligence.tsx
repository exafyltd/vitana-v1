import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  TrendingUp, 
  UserPlus, 
  Eye,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ViewModeIntelligenceProps {
  isOwnProfile?: boolean;
  viewerCompatibility?: number;
  similarProfiles?: Array<{
    id: string;
    name: string;
    avatar: string;
    commonInterests: string[];
    compatibility: number;
  }>;
  profileInsights?: {
    viewsThisWeek: number;
    profileCompleteness: number;
    engagementRate: number;
  };
  className?: string;
}

export function ViewModeIntelligence({ 
  isOwnProfile = false,
  viewerCompatibility = 0,
  similarProfiles = [],
  profileInsights,
  className 
}: ViewModeIntelligenceProps) {
  // Mock data for demonstration
  const defaultSimilarProfiles = [
    {
      id: '1',
      name: 'Emma Wilson',
      avatar: '/lovable-uploads/emma-wilson-avatar.jpg',
      commonInterests: ['Yoga', 'Meditation'],
      compatibility: 87
    },
    {
      id: '2', 
      name: 'Mike Thompson',
      avatar: '/lovable-uploads/mike-thompson-avatar.jpg',
      commonInterests: ['Fitness', 'Nutrition'],
      compatibility: 82
    },
    {
      id: '3',
      name: 'Lisa Chen',
      avatar: '/lovable-uploads/lisa-chen-avatar.jpg',
      commonInterests: ['Mindfulness', 'Wellness'],
      compatibility: 79
    }
  ];

  const defaultInsights = {
    viewsThisWeek: 24,
    profileCompleteness: 85,
    engagementRate: 12.5
  };

  const profiles = similarProfiles.length > 0 ? similarProfiles : defaultSimilarProfiles;
  const insights = profileInsights || defaultInsights;

  // Show different content based on profile ownership
  if (isOwnProfile) {
    return (
      <Card className={`rounded-xl shadow-sm ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-[hsl(var(--util-profile-accent))]" />
            Profile Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[hsl(var(--sys-vitana-accent))]">
                {insights.viewsThisWeek}
              </div>
              <div className="text-xs text-muted-foreground">{t('screens.profile.viewsThisWeek')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[hsl(var(--domain-community-accent))]">
                {insights.profileCompleteness}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[hsl(var(--pill-mental-accent))]">
                {insights.engagementRate}%
              </div>
              <div className="text-xs text-muted-foreground">Engagement</div>
            </div>
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-[hsl(var(--util-profile-accent))] to-[hsl(var(--domain-community-accent))] hover:from-[hsl(var(--util-profile-accent)/0.9)] hover:to-[hsl(var(--domain-community-accent)/0.9)] text-white border-0"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Boost Profile Visibility
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show recommendations for viewing other profiles
  return (
    <Card className={`rounded-xl shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-[hsl(var(--pill-mental-accent))]" />
          People You Might Like
        </CardTitle>
        {viewerCompatibility >= 70 && (
          <Badge className="w-fit bg-gradient-to-r from-[hsl(var(--domain-community-accent))] to-[hsl(var(--pill-nutrition-accent))] text-white border-0">
            Based on your compatibility with Sarah
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {profiles.slice(0, 3).map((profile) => (
            <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{profile.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{profile.name}</div>
                  <div className="flex gap-1 mt-1">
                    {profile.commonInterests.slice(0, 2).map((interest, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  {profile.compatibility}% match
                </div>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-[hsl(var(--pill-mental-accent))] hover:bg-[hsl(var(--pill-mental-accent)/0.1)]"
        >
          See More Recommendations
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}