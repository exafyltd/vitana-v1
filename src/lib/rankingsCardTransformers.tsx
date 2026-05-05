import React from 'react';
import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { Users, TrendingUp, Activity, Star, Calendar, Award, Trophy, Flame, BarChart, UserPlus, CheckCircle, Target, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

// Position badge configurations
const getPositionBadge = (position: number) => {
  switch (position) {
    case 1:
      return { icon: '🥇', label: '1st Place', color: 'text-yellow-600', bg: 'bg-yellow-50/50', border: 'border-yellow-400' };
    case 2:
      return { icon: '🥈', label: '2nd Place', color: 'text-gray-600', bg: 'bg-gray-50/50', border: 'border-gray-400' };
    case 3:
      return { icon: '🥉', label: '3rd Place', color: 'text-orange-600', bg: 'bg-orange-50/50', border: 'border-orange-400' };
    default:
      return { icon: '📍', label: `#${position}`, color: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-400' };
  }
};

// Get border styling by position
const getPositionBorderStyle = (position: number) => {
  switch (position) {
    case 1:
      return 'border-2 border-yellow-400/70 hover:border-yellow-400/90 rounded-xl shadow-[0_0_12px_rgba(234,179,8,0.25)] hover:shadow-[0_0_16px_rgba(234,179,8,0.35)]';
    case 2:
      return 'border-gray-400/50 hover:border-gray-400/70 hover:shadow-lg hover:shadow-gray-400/15';
    case 3:
      return 'border-orange-400/50 hover:border-orange-400/70 hover:shadow-lg hover:shadow-orange-400/15';
    default:
      return 'border-white/10 hover:border-white/20';
  }
};

// Trend indicator component
const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <ArrowUp className="w-3 h-3 text-green-600" />;
  if (trend === 'down') return <ArrowDown className="w-3 h-3 text-red-600" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
};

// Ranking stats table component
const RankingStatsTable = ({ stats }: { stats: Array<{label: string, value: string | number, trend?: 'up' | 'down' | 'stable'}> }) => (
  <div className="bg-white/40 rounded-lg p-3 space-y-1.5">
    {stats.map((stat, idx) => (
      <div key={idx} className="grid grid-cols-[1fr_auto_16px] gap-2 items-center text-sm">
        <span className="text-muted-foreground text-left">{stat.label}</span>
        <span className="font-semibold text-foreground text-right tabular-nums">{stat.value}</span>
        <div className="flex justify-end">
          {stat.trend && <TrendIcon trend={stat.trend} />}
        </div>
      </div>
    ))}
  </div>
);

// Organizer link component
const OrganizerLink = ({ organizer }: { organizer: { name: string, id: string, avatar?: string } }) => (
  <div className="mt-3 pt-3 border-t border-white/20">
    <div className="flex items-center gap-2">
      {organizer.avatar && (
        <img 
          src={organizer.avatar} 
          alt={organizer.name}
          className="w-8 h-8 rounded-full object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{t('screens.common.organizedBy')}</p>
        <p className="text-sm font-medium text-foreground truncate">{organizer.name}</p>
      </div>
      <Button 
        size="sm" 
        variant="outline"
        className="text-xs h-7"
        onClick={(e) => {
          e.stopPropagation();
          // Navigate to organizer profile
          console.log('View organizer:', organizer.id);
        }}
      >
        View
      </Button>
    </div>
  </div>
);

// Transform Group Ranking to Card
export const transformGroupRankingToCard = (
  group: any,
  position: number
): VisualHorizontalCardProps => {
  const positionBadge = getPositionBadge(position);
  const borderStyle = getPositionBorderStyle(position);
  
  // Calculate comparative metrics
  const leadingBy = position === 1 && group.members ? `Leading by ${group.members - 980} members` : undefined;
  const growthText = group.growthRate ? `+${group.growthRate}% growth` : undefined;
  
  return {
    id: group.id,
    screenId: 'COMMUNITY_RANKINGS_GROUPS',
    imageUrl: group.imageUrl,
    imageAlt: group.title,
    category: {
      icon: '👥',
      label: 'Group',
      color: 'hsl(var(--primary))'
    },
    title: group.title,
    description: group.description || `${group.members || group.attendees} members • ${group.pillar}`,
    motivationalHook: leadingBy || growthText || 'Top performing group',
    metadata: [
      {
        icon: <Users className="w-3.5 h-3.5" />,
        text: `${group.members || group.attendees} members`
      },
      {
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: `${group.growthRate || 15}%`
      },
      {
        icon: <Activity className="w-3.5 h-3.5" />,
        text: `Score: ${group.engagementScore || 92}`
      }
    ],
    statusBadge: {
      label: positionBadge.label,
      variant: 'default',
      icon: <span className="text-lg">{positionBadge.icon}</span>
    },
    secondaryLabel: group.pillar,
    expandedContent: (
      <>
        <RankingStatsTable 
          stats={[
            { label: 'Total Members', value: group.members || group.attendees, trend: 'up' },
            { label: 'Active Members', value: group.activeMembers || Math.floor((group.members || group.attendees) * 0.69), trend: 'stable' },
            { label: 'Growth Rate (30d)', value: `+${group.growthRate || 15}%`, trend: 'up' },
            { label: 'Engagement Score', value: `${group.engagementScore || 92}/100`, trend: 'up' },
            { label: 'Posts This Week', value: group.postsThisWeek || 124 }
          ]}
        />
        {group.organizer && <OrganizerLink organizer={group.organizer} />}
      </>
    ),
    className: cn(borderStyle),
    onClick: () => {
      console.log('Navigate to group:', group.id);
      // Will navigate to /comm/my-groups/${group.id}
    }
  };
};

// Transform Event Ranking to Card
export const transformEventRankingToCard = (
  event: any,
  position: number
): VisualHorizontalCardProps => {
  const positionBadge = getPositionBadge(position);
  const borderStyle = getPositionBorderStyle(position);
  
  const mostPopular = position === 1 ? 'Most popular event' : undefined;
  const ratingText = event.averageRating ? `${event.averageRating}⭐ rating` : undefined;
  
  return {
    id: event.id,
    screenId: 'COMMUNITY_RANKINGS_EVENTS',
    imageUrl: event.imageUrl,
    imageAlt: event.title,
    category: {
      icon: '📅',
      label: 'Event',
      color: 'hsl(var(--primary))'
    },
    title: event.title,
    description: event.description || `${event.attendees} attendees • ${event.pillar}`,
    motivationalHook: mostPopular || ratingText || 'Top performing event',
    metadata: [
      {
        icon: <Users className="w-3.5 h-3.5" />,
        text: `${event.attendees} attending`
      },
      {
        icon: <Star className="w-3.5 h-3.5" />,
        text: `${event.averageRating || 4.8}⭐`
      },
      {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        text: `${event.completionRate || 87}% shown`
      }
    ],
    statusBadge: {
      label: positionBadge.label,
      variant: 'default',
      icon: <span className="text-lg">{positionBadge.icon}</span>
    },
    secondaryLabel: event.pillar,
    expandedContent: (
      <>
        <RankingStatsTable 
          stats={[
            { label: 'Confirmed Attendees', value: event.attendees, trend: 'up' },
            { label: 'Total Registered', value: event.registrations || event.attendees + 22, trend: 'up' },
            { label: 'Completion Rate', value: `${event.completionRate || 87}%`, trend: 'up' },
            { label: 'Average Rating', value: `${event.averageRating || 4.8}/5.0`, trend: 'stable' },
            { label: 'Repeat Attendees', value: event.repeatAttendees || 23 }
          ]}
        />
        {event.organizer && <OrganizerLink organizer={event.organizer} />}
      </>
    ),
    className: cn(borderStyle),
    onClick: () => {
      console.log('View event details:', event.id);
      // Will open event details drawer
    }
  };
};

// Transform Creator Ranking to Card
export const transformCreatorRankingToCard = (
  creator: any,
  position: number
): VisualHorizontalCardProps => {
  const positionBadge = getPositionBadge(position);
  const borderStyle = getPositionBorderStyle(position);
  
  const topLeader = position === 1 ? 'Top community leader' : undefined;
  const impactText = creator.impactScore ? `Impact score: ${creator.impactScore}` : undefined;
  
  return {
    id: creator.id,
    screenId: 'COMMUNITY_RANKINGS_CREATORS',
    imageUrl: creator.imageUrl,
    imageAlt: creator.title || creator.author?.name,
    category: {
      icon: '⭐',
      label: 'Creator',
      color: 'hsl(var(--primary))'
    },
    title: creator.title || creator.author?.name || 'Community Creator',
    description: creator.description || `${creator.eventsHosted || 12} events hosted • ${creator.pillar}`,
    motivationalHook: topLeader || impactText || 'Elite community creator',
    metadata: [
      {
        icon: <Calendar className="w-3.5 h-3.5" />,
        text: `${creator.eventsHosted || 12} events`
      },
      {
        icon: <Users className="w-3.5 h-3.5" />,
        text: `${creator.totalAttendees || 342} reach`
      },
      {
        icon: <Trophy className="w-3.5 h-3.5" />,
        text: `${creator.impactScore || 95}/100`
      }
    ],
    statusBadge: {
      label: positionBadge.label,
      variant: 'default',
      icon: <span className="text-lg">{positionBadge.icon}</span>
    },
    secondaryLabel: creator.specialization || creator.pillar,
    expandedContent: (
      <>
        <RankingStatsTable 
          stats={[
            { label: 'Events Hosted (30d)', value: creator.eventsHosted || 12, trend: 'up' },
            { label: 'Total Attendees', value: creator.totalAttendees || 342, trend: 'up' },
            { label: 'Average Rating', value: `${creator.averageRating || 4.9}/5.0`, trend: 'stable' },
            { label: 'Impact Score', value: `${creator.impactScore || 95}/100`, trend: 'up' },
            { label: 'Repeat Rate', value: `${creator.repeatRate || 78}%` }
          ]}
        />
        {creator.organizedBy && (
          <div className="mt-2 pt-2 border-t border-border/20 text-xs text-muted-foreground">
            Organized by {creator.organizedBy}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border/30 flex justify-end">
          <Button
            className="ml-auto opacity-80 hover:opacity-100 transition-opacity"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.history.pushState({}, '', `/u/${creator.id}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            View Full Profile
          </Button>
        </div>
      </>
    ),
    className: cn(borderStyle),
    onClick: () => {
      window.history.pushState({}, '', `/u/${creator.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
};

// Transform Member Ranking to Card
export const transformMemberRankingToCard = (
  member: any,
  position: number,
  rankingType: 'vitana_index' | 'pillar_specific' = 'vitana_index'
): VisualHorizontalCardProps => {
  const positionBadge = getPositionBadge(position);
  const borderStyle = getPositionBorderStyle(position);
  
  const elitePerformer = position === 1 ? 'Elite performer' : undefined;
  const percentileText = member.percentile ? `Top ${100 - member.percentile}%` : undefined;
  
  return {
    id: member.user_id,
    screenId: 'COMMUNITY_RANKINGS_MEMBERS',
    imageUrl: member.avatar_url,
    imageAlt: member.display_name,
    category: {
      icon: '💎',
      label: 'Member',
      color: 'hsl(var(--primary))'
    },
    title: member.display_name,
    description: `VITANA Score: ${member.vitana_score} • ${member.vitana_tier}`,
    motivationalHook: elitePerformer || percentileText || `${member.score_30d_change > 0 ? '+' : ''}${member.score_30d_change} in 30d`,
    metadata: [
      {
        icon: <Target className="w-3.5 h-3.5" />,
        text: `${member.vitana_score} pts`
      },
      {
        icon: <Flame className="w-3.5 h-3.5" />,
        text: `${member.wellness_streak_days} day streak`
      },
      {
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: `${member.score_30d_change > 0 ? '+' : ''}${member.score_30d_change}`
      }
    ],
    statusBadge: {
      label: positionBadge.label,
      variant: 'default',
      icon: <span className="text-lg">{positionBadge.icon}</span>
    },
    secondaryLabel: member.vitana_tier,
    expandedContent: (
      <>
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">{t('screens.common.pillarBreakdown')}</p>
          <RankingStatsTable 
            stats={[
              { label: '💤 Sleep', value: member.pillar_scores.sleep, trend: 'up' },
              { label: '💪 Exercise', value: member.pillar_scores.exercise, trend: 'up' },
              { label: '🍎 Nutrition', value: member.pillar_scores.nutrition, trend: 'stable' },
              { label: '💧 Hydration', value: member.pillar_scores.hydration, trend: 'up' },
              { label: '🧠 Mental', value: member.pillar_scores.mental, trend: 'stable' }
            ]}
          />
        </div>
        <RankingStatsTable 
          stats={[
            { label: 'Total VITANA Score', value: member.vitana_score, trend: member.score_trend },
            { label: 'Wellness Streak', value: `${member.wellness_streak_days} days`, trend: 'up' },
            { label: '30-Day Change', value: member.score_30d_change > 0 ? `+${member.score_30d_change}` : member.score_30d_change, trend: member.score_30d_change > 0 ? 'up' : 'down' },
            { label: 'Total Activities', value: member.total_activities || 0 }
          ]}
        />
        <div className="mt-3 pt-3 border-t border-border/30 flex justify-end">
          <Button
            className="ml-auto opacity-80 hover:opacity-100 transition-opacity"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.history.pushState({}, '', `/u/${member.user_id}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            View Full Profile
          </Button>
        </div>
      </>
    ),
    className: cn(borderStyle),
    onClick: () => {
      window.history.pushState({}, '', `/u/${member.user_id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
};
