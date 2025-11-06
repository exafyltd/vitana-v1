import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { getVitanaIndexTier, formatVitanaIndexScore } from '@/lib/vitanaIndex';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
    density: 'compact',
    screenId: 'COMMUNITY_RANKINGS_CREATORS',
    onClick: () => {
      console.log('View creator profile:', creator.id);
      // TODO: Navigate to creator profile
    }
  };
}
