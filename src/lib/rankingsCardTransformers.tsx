import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { getVitanaIndexTier, formatVitanaIndexScore } from '@/lib/vitanaIndex';
import { TrendingUp, TrendingDown, Minus, Users, Calendar, Award, Activity, Droplet, Moon, Utensils, Dumbbell, Brain } from 'lucide-react';
import React from 'react';

/**
 * Member Ranking Data Structure
 */
export interface MemberRanking {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  vitana_score: number;
  vitana_tier: string;
  score_trend: 'up' | 'down' | 'stable';
  pillar_scores?: {
    sleep: number;
    exercise: number;
    nutrition: number;
    hydration: number;
    mental: number;
  };
  wellness_streak_days: number;
  score_30d_change: number;
  total_activities: number;
  achievements?: Array<{
    title: string;
    description: string;
    earned_at: string;
  }>;
}

/**
 * Get trend icon component
 */
function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return '↗️';
    case 'down':
      return '↘️';
    default:
      return '→';
  }
}

/**
 * Get rank emoji based on position
 */
function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '🏅';
}

/**
 * Get rank-specific accent color
 */
function getRankColor(rank: number): string {
  if (rank === 1) return 'hsl(45, 100%, 50%)'; // Gold
  if (rank === 2) return 'hsl(0, 0%, 75%)'; // Silver
  if (rank === 3) return 'hsl(30, 80%, 60%)'; // Bronze
  return 'hsl(217, 91%, 60%)'; // Blue
}

/**
 * Get description by ranking type
 */
function getDescriptionByType(member: MemberRanking, type: string): string {
  switch (type) {
    case 'vitana_index':
      return `${formatVitanaIndexScore(member.vitana_score)} • ${member.total_activities || 0} activities`;
    case 'most_improved':
      return `+${member.score_30d_change} points in 30 days`;
    case 'streak':
      return `${member.wellness_streak_days} day streak 🔥`;
    case 'balanced':
      return `Balanced across all 5 wellness pillars`;
    default:
      return '';
  }
}

/**
 * Transform Member Ranking to Visual Horizontal Card
 */
export function transformMemberRankingToCard(
  member: MemberRanking,
  rank: number,
  rankingType: 'vitana_index' | 'most_improved' | 'streak' | 'balanced' = 'vitana_index'
): VisualHorizontalCardProps {
  const tier = getVitanaIndexTier(member.vitana_score);
  const rankEmoji = getRankEmoji(rank);
  
  // Category badge varies by ranking type
  const categoryConfig = {
    vitana_index: {
      icon: '💎',
      label: 'Top VITANA',
      color: tier.color
    },
    most_improved: {
      icon: '📈',
      label: 'Most Improved',
      color: 'hsl(142, 71%, 45%)' // Green
    },
    streak: {
      icon: '🔥',
      label: 'Streak Leader',
      color: 'hsl(24, 95%, 53%)' // Orange
    },
    balanced: {
      icon: '⚖️',
      label: 'Balanced',
      color: 'hsl(217, 91%, 60%)' // Blue
    }
  };

  const config = categoryConfig[rankingType];

  // Expanded content: Pillar scores breakdown
  const expandedContent = member.pillar_scores ? (
    <div className="space-y-3 pt-2">
      <h4 className="text-sm font-semibold text-foreground">Wellness Pillar Breakdown</h4>
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Sleep</span>
          </div>
          <span className="text-sm font-bold text-foreground">{member.pillar_scores.sleep}</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Exercise</span>
          </div>
          <span className="text-sm font-bold text-foreground">{member.pillar_scores.exercise}</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Nutrition</span>
          </div>
          <span className="text-sm font-bold text-foreground">{member.pillar_scores.nutrition}</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Hydration</span>
          </div>
          <span className="text-sm font-bold text-foreground">{member.pillar_scores.hydration}</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Mental Wellness</span>
          </div>
          <span className="text-sm font-bold text-foreground">{member.pillar_scores.mental}</span>
        </div>
      </div>
      {member.achievements && member.achievements.length > 0 && (
        <>
          <h4 className="text-sm font-semibold text-foreground pt-2">Recent Achievements</h4>
          <div className="space-y-2">
            {member.achievements.slice(0, 3).map((achievement, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
                <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  ) : null;

  return {
    id: `member-rank-${member.user_id}`,
    title: `${rankEmoji} ${member.display_name || 'Anonymous User'}`,
    description: getDescriptionByType(member, rankingType),
    imageUrl: member.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    imageAlt: member.display_name || 'Member',
    category: {
      icon: config.icon,
      label: config.label,
      color: config.color
    },
    metadata: [
      {
        icon: '💯',
        text: `${formatVitanaIndexScore(member.vitana_score)} • ${tier.label}`
      },
      {
        icon: getTrendIcon(member.score_trend),
        text: member.score_trend === 'up' ? 'Rising' : member.score_trend === 'down' ? 'Falling' : 'Stable'
      }
    ],
    statusBadge: {
      label: `${rankEmoji} #${rank}`,
      variant: rank <= 3 ? 'default' : 'secondary',
      icon: rankEmoji
    },
    secondaryLabel: member.score_trend === 'up' ? 'Rising' : member.score_trend === 'down' ? 'Falling' : 'Stable',
    expandedContent,
    density: 'compact',
    screenId: 'COMMUNITY_RANKINGS_MEMBERS',
    onClick: () => {
      console.log('View member profile:', member.user_id);
      // TODO: Implement navigation to profile page
    }
  };
}

/**
 * Transform Group Ranking to Visual Horizontal Card
 */
export function transformGroupRankingToCard(
  group: any,
  rank: number
): VisualHorizontalCardProps {
  const rankEmoji = getRankEmoji(rank);
  const rankColor = getRankColor(rank);
  
  // Expanded content: Group activity stats
  const expandedContent = (
    <div className="space-y-3 pt-2">
      <h4 className="text-sm font-semibold text-foreground">Group Activity</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Members</span>
          </div>
          <p className="text-lg font-bold text-foreground">{group.attendees || 0}</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Activity</span>
          </div>
          <p className="text-lg font-bold text-foreground">{group.timestamp || 'Active'}</p>
        </div>
      </div>
      <div className="pt-2">
        <h4 className="text-sm font-semibold text-foreground mb-2">Focus Area</h4>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span className="text-sm font-medium">{group.pillar || 'Wellness'}</span>
        </div>
      </div>
      <div className="pt-2">
        <h4 className="text-sm font-semibold text-foreground mb-2">Location</h4>
        <p className="text-sm text-muted-foreground">{group.location || 'Virtual'}</p>
      </div>
    </div>
  );

  return {
    id: `group-rank-${group.id}`,
    title: `${rankEmoji} ${group.title}`,
    description: group.description,
    imageUrl: group.imageUrl,
    imageAlt: group.title,
    category: {
      icon: '🏆',
      label: 'Top Group',
      color: rankColor
    },
    metadata: [
      {
        icon: '👥',
        text: `${group.attendees || 0} members`
      },
      {
        icon: '📍',
        text: group.location || 'Virtual'
      }
    ],
    statusBadge: {
      label: `${rankEmoji} #${rank}`,
      variant: rank <= 3 ? 'default' : 'secondary',
      icon: rankEmoji
    },
    secondaryLabel: 'Weekly',
    expandedContent,
    density: 'compact',
    screenId: 'COMMUNITY_RANKINGS_GROUPS',
    onClick: () => {
      console.log('View group:', group.id);
      // TODO: Navigate to group detail
    }
  };
}

/**
 * Transform Event Ranking to Visual Horizontal Card
 */
export function transformEventRankingToCard(
  event: any,
  rank: number
): VisualHorizontalCardProps {
  const rankEmoji = getRankEmoji(rank);
  const rankColor = getRankColor(rank);
  
  // Format event dates
  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return 'Date TBA';
    }
  };

  // Expanded content: Event schedule details
  const expandedContent = (
    <div className="space-y-3 pt-2">
      <h4 className="text-sm font-semibold text-foreground">Event Details</h4>
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
          <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Start Time</p>
            <p className="text-sm font-medium text-foreground">
              {event.start_time ? formatEventDate(event.start_time) : 'TBA'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
          <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Attendance</p>
            <p className="text-sm font-medium text-foreground">{event.attendees || 0} participants</p>
          </div>
        </div>
        {event.author && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
            <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Hosted by</p>
              <p className="text-sm font-medium text-foreground">{event.author.name}</p>
            </div>
          </div>
        )}
      </div>
      <div className="pt-2">
        <h4 className="text-sm font-semibold text-foreground mb-2">Category</h4>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span className="text-sm font-medium capitalize">{event.category || event.pillar || 'Wellness'}</span>
        </div>
      </div>
    </div>
  );

  return {
    id: `event-rank-${event.id}`,
    title: `${rankEmoji} ${event.title}`,
    description: event.description,
    imageUrl: event.imageUrl,
    imageAlt: event.title,
    category: {
      icon: '📅',
      label: 'Top Event',
      color: rankColor
    },
    metadata: [
      {
        icon: '👥',
        text: `${event.attendees || 0} attending`
      },
      {
        icon: '📍',
        text: event.location || 'Virtual'
      }
    ],
    statusBadge: {
      label: event.timestamp || `#${rank}`,
      variant: rank <= 3 ? 'default' : 'secondary'
    },
    secondaryLabel: 'This Week',
    expandedContent,
    density: 'compact',
    screenId: 'COMMUNITY_RANKINGS_EVENTS',
    onClick: () => {
      console.log('View event:', event.id);
      // TODO: Navigate to event detail or open RSVP modal
    }
  };
}

/**
 * Transform Creator Ranking to Visual Horizontal Card
 */
export function transformCreatorRankingToCard(
  creator: any,
  rank: number
): VisualHorizontalCardProps {
  const rankEmoji = getRankEmoji(rank);
  const rankColor = getRankColor(rank);
  
  // Parse event count from timestamp if available
  const eventCount = creator.timestamp?.match(/\d+/)?.[0] || '0';
  
  // Expanded content: Creator achievements and stats
  const expandedContent = (
    <div className="space-y-3 pt-2">
      <h4 className="text-sm font-semibold text-foreground">Creator Stats</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Events</span>
          </div>
          <p className="text-lg font-bold text-foreground">{eventCount}</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Rank</span>
          </div>
          <p className="text-lg font-bold text-foreground">#{rank}</p>
        </div>
      </div>
      <div className="pt-2">
        <h4 className="text-sm font-semibold text-foreground mb-2">Specialty</h4>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span className="text-sm font-medium">{creator.pillar || 'Wellness'}</span>
        </div>
      </div>
      <div className="pt-2">
        <h4 className="text-sm font-semibold text-foreground mb-2">Primary Venue</h4>
        <p className="text-sm text-muted-foreground">{creator.location || 'Multiple venues'}</p>
      </div>
      {creator.author && (
        <div className="pt-2">
          <h4 className="text-sm font-semibold text-foreground mb-2">About</h4>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">{creator.author.name}</span>
          </div>
        </div>
      )}
    </div>
  );
  
  return {
    id: `creator-rank-${creator.id}`,
    title: creator.title, // e.g., "Lisa Chen - Wellness Guru"
    description: creator.description, // e.g., "Hosted 12 events this month"
    imageUrl: creator.imageUrl,
    imageAlt: creator.author?.name || creator.title,
    category: {
      icon: '⭐',
      label: 'Top Creator',
      color: rankColor
    },
    metadata: [
      {
        icon: '🎯',
        text: creator.timestamp || 'Active' // e.g., "12 Events Hosted"
      },
      {
        icon: '📍',
        text: creator.location || 'Multiple venues'
      }
    ],
    statusBadge: {
      label: `${rankEmoji} #${rank}`,
      variant: rank <= 3 ? 'default' : 'secondary',
      icon: rankEmoji
    },
    secondaryLabel: 'Monthly',
    expandedContent,
    density: 'compact',
    screenId: 'COMMUNITY_RANKINGS_CREATORS',
    onClick: () => {
      console.log('View creator profile:', creator.id);
      // TODO: Navigate to creator profile
    }
  };
}
