import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  MessageSquare, 
  Image, 
  Users, 
  Heart, 
  TrendingUp,
  Play,
  Calendar
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface TabPreview {
  type: 'posts' | 'media' | 'groups' | 'health' | 'services';
  count: number;
  recentActivity?: string;
  highlights?: string[];
  engagement?: {
    likes: number;
    comments: number;
  };
}

interface SmartTabPreviewProps {
  tabType: 'posts' | 'media' | 'groups' | 'health' | 'services';
  isActive: boolean;
  preview?: TabPreview;
  className?: string;
}

export function SmartTabPreview({ 
  tabType, 
  isActive, 
  preview,
  className 
}: SmartTabPreviewProps) {
  // Mock preview data based on tab type
  const getPreviewData = (): TabPreview => {
    if (preview) return preview;
    
    switch (tabType) {
      case 'posts':
        return {
          type: 'posts',
          count: 24,
          recentActivity: '2 hours ago',
          highlights: ['Mindfulness tips', 'Morning routine', 'Healthy recipes'],
          engagement: { likes: 156, comments: 32 }
        };
      case 'media':
        return {
          type: 'media',
          count: 18,
          recentActivity: '1 day ago',
          highlights: ['Yoga flows', 'Recipe videos', 'Progress photos'],
          engagement: { likes: 89, comments: 12 }
        };
      case 'groups':
        return {
          type: 'groups',
          count: 5,
          recentActivity: 'Active in 3',
          highlights: ['Wellness Warriors', 'Morning Yoga', 'Nutrition Hub']
        };
      case 'health':
        return {
          type: 'health',
          count: 12,
          recentActivity: 'Updated today',
          highlights: ['Vitana Index: 78', 'Sleep: 8.2h avg', 'Steps: 10k+']
        };
      case 'services':
        return {
          type: 'services',
          count: 3,
          recentActivity: '5 bookings this week',
          highlights: ['1-on-1 Coaching', 'Group Sessions', 'Meal Plans']
        };
      default:
        return { type: tabType, count: 0 };
    }
  };

  const data = getPreviewData();
  
  const getTabIcon = () => {
    switch (tabType) {
      case 'posts': return <MessageSquare className="h-3 w-3" />;
      case 'media': return <Image className="h-3 w-3" />;
      case 'groups': return <Users className="h-3 w-3" />;
      case 'health': return <TrendingUp className="h-3 w-3" />;
      case 'services': return <Calendar className="h-3 w-3" />;
      default: return null;
    }
  };

  const getTabColor = () => {
    switch (tabType) {
      case 'posts': return 'hsl(var(--domain-community-accent))';
      case 'media': return 'hsl(var(--pill-mental-accent))';
      case 'groups': return 'hsl(var(--pill-nutrition-accent))';
      case 'health': return 'hsl(var(--sys-vitana-accent))';
      case 'services': return 'hsl(var(--util-profile-accent))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  // Don't show preview if not active or no content
  if (!isActive || data.count === 0) return null;

  return (
    <Card className={`mt-4 p-4 border-l-4 bg-gradient-to-r from-background to-background/50 ${className}`}
          style={{ borderLeftColor: getTabColor() }}>
      <div className="space-y-3">
        {/* Header with count and activity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="rounded-full p-1"
              style={{ 
                backgroundColor: `${getTabColor()}15`,
                border: `1px solid ${getTabColor()}30`
              }}
            >
              {getTabIcon()}
            </div>
            <span className="font-medium text-sm">
              {data.count} {tabType}
            </span>
          </div>
          
          {data.recentActivity && (
            <Badge variant="outline" className="text-xs">
              {data.recentActivity}
            </Badge>
          )}
        </div>

        {/* Highlights */}
        {data.highlights && data.highlights.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{t('screens.profile.recentHighlights')}</div>
            <div className="flex flex-wrap gap-1">
              {data.highlights.slice(0, 3).map((highlight, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {highlight}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Engagement stats */}
        {data.engagement && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" style={{ color: getTabColor() }} />
              {data.engagement.likes} likes
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {data.engagement.comments} comments
            </div>
          </div>
        )}

        {/* Media specific preview */}
        {tabType === 'media' && (
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i}
                className="h-12 w-12 rounded bg-muted flex items-center justify-center relative overflow-hidden"
              >
                {i === 1 && <Play className="h-4 w-4 text-muted-foreground" />}
                {i !== 1 && <Image className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
            <div className="h-12 w-12 rounded bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">+{data.count - 4}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}