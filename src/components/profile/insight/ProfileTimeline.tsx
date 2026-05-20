import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  UserPlus, 
  FileText, 
  Users, 
  Calendar, 
  Trophy,
  Video
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface TimelineItem {
  date: string;
  type: 'joined' | 'post' | 'group' | 'event' | 'achievement' | 'live';
  description: string;
}

interface ProfileTimelineProps {
  milestones?: TimelineItem[];
  className?: string;
}

const defaultMilestones: TimelineItem[] = [
  {
    date: '2024-01-15',
    type: 'joined',
    description: 'Joined VITANA community'
  },
  {
    date: '2024-01-20',
    type: 'post',
    description: 'Published first post'
  },
  {
    date: '2024-02-10',
    type: 'group',
    description: 'Joined "Mindful Living" group'
  },
  {
    date: '2024-03-05',
    type: 'achievement',
    description: 'Reached 100 followers milestone'
  },
  {
    date: '2024-03-20',
    type: 'event',
    description: 'Hosted first community event'
  }
];

const getTimelineIcon = (type: string) => {
  const icons = {
    joined: UserPlus,
    post: FileText,
    group: Users,
    event: Calendar,
    achievement: Trophy,
    live: Video
  };
  return icons[type as keyof typeof icons] || FileText;
};

const getTimelineColor = (type: string) => {
  const colors = {
    joined: 'from-blue-500 to-sky-500',
    post: 'from-violet-500 to-purple-500',
    group: 'from-emerald-500 to-teal-500',
    event: 'from-amber-500 to-orange-500',
    achievement: 'from-pink-500 to-rose-500',
    live: 'from-red-500 to-pink-500'
  };
  return colors[type as keyof typeof colors] || 'from-gray-500 to-slate-500';
};

export function ProfileTimeline({ milestones, className }: ProfileTimelineProps) {
  const displayMilestones = milestones && milestones.length > 0 ? milestones : defaultMilestones;

  return (
    <Card className={`rounded-2xl shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-[hsl(var(--util-profile-accent))]" />
          {t('screens.profile.communityJourney')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-2rem)] before:w-0.5 before:bg-gradient-to-b before:from-[hsl(var(--domain-community-accent))] before:to-transparent">
          {displayMilestones.map((milestone, index) => {
            const IconComponent = getTimelineIcon(milestone.type);
            const color = getTimelineColor(milestone.type);
            
            return (
              <div key={index} className="relative flex gap-4 items-start pl-2">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-md z-10`}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium text-foreground">
                    {milestone.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(new Date(milestone.date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
