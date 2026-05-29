import { StandardHorizontalCardProps } from '@/components/ui/standard-horizontal-card';
import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { Award, TrendingUp, CheckCircle, AlertTriangle, Zap, Activity, Brain, Droplets, EyeOff } from 'lucide-react';
import { AutopilotActionStatus } from '@/types/autopilot';
import { createElement } from 'react';
import { getCtaForScreen } from './cta-taxonomy';
import { toast } from '@/components/ui/use-toast';

// Import images for routines (Visual pattern)
import sunriseRoutineImg from '@/assets/ai-feed/sunrise-routine.jpg';
import hydrationTrackingImg from '@/assets/ai-feed/hydration-tracking.jpg';
import eveningWinddownImg from '@/assets/ai-feed/evening-winddown.jpg';
import { notify } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
interface ActivityItem {
  id: string;
  type: 'action' | 'routine' | 'suggestion';
  title: string;
  reason: string;
  timestamp: Date;
  status: AutopilotActionStatus;
  icon: string;
  category: string;
}

interface RoutineItem {
  id: string;
  name: string;
  description: string;
  image: string;
  streak: number;
  successRate: number;
  frequency: string;
  active: boolean;
}

const getCategoryImage = (category: string, title: string) => {
  if (title.toLowerCase().includes('hydration') || title.toLowerCase().includes('water')) {
    return hydrationTrackingImg;
  }
  if (title.toLowerCase().includes('morning') || title.toLowerCase().includes('routine')) {
    return sunriseRoutineImg;
  }
  if (title.toLowerCase().includes('evening') || title.toLowerCase().includes('wind')) {
    return eveningWinddownImg;
  }
  switch (category) {
    case 'health': return hydrationTrackingImg;
    default: return sunriseRoutineImg;
  }
};

const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'health': return 'hsl(var(--pill-mental))';
    case 'hydration': return 'hsl(var(--pill-hydration))';
    case 'sleep': return 'hsl(var(--primary))';
    case 'exercise': return 'hsl(var(--sys-warning))';
    default: return 'hsl(var(--accent))';
  }
};

const getMotivationalHook = (title: string, status: AutopilotActionStatus) => {
  if (title.toLowerCase().includes('hydration')) {
    return status === 'completed' ? 'Hydration mastery achieved 💧✨' : 'Your body is calling for water 💧';
  }
  if (title.toLowerCase().includes('morning')) {
    return status === 'completed' ? 'Morning flow complete - energy peak unlocked ⚡' : 'Your 8 AM energy peak is waiting ☀️';
  }
  if (title.toLowerCase().includes('evening')) {
    return status === 'completed' ? 'Wind-down ritual mastered 🌙' : 'Time to prepare for restful sleep 😴';
  }
  return status === 'completed' ? 'Action completed successfully ✨' : 'AI suggestion ready for you ⚡';
};

const getStatusIcon = (status: AutopilotActionStatus) => {
  switch (status) {
    case 'completed': return createElement(CheckCircle, { className: 'w-3 h-3' });
    case 'failed': return createElement(AlertTriangle, { className: 'w-3 h-3' });
    case 'executing': return createElement(Zap, { className: 'w-3 h-3' });
    default: return null;
  }
};

const getStatusVariant = (status: AutopilotActionStatus): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (status) {
    case 'completed': return 'default';
    case 'failed': return 'destructive';
    case 'executing': return 'secondary';
    default: return 'outline';
  }
};

const getStatusDot = (status: AutopilotActionStatus): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'executing': return 'warning';
    default: return 'info';
  }
};

const getSecondaryInfo = (category: string, title: string) => {
  const mockData = {
    streak: Math.floor(Math.random() * 14) + 1,
    credits: Math.floor(Math.random() * 50) + 10,
  };

  if (title.toLowerCase().includes('hydration')) {
    return { streak: mockData.streak, credits: mockData.credits };
  }
  if (title.toLowerCase().includes('exercise') || title.toLowerCase().includes('workout')) {
    return { streak: mockData.streak, credits: mockData.credits };
  }
  return { streak: mockData.streak, credits: mockData.credits };
};

const getCategoryIcon = (category: string, emoji: string) => {
  const color = getCategoryColor(category);
  return createElement(
    'div',
    {
      className: 'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
      style: { backgroundColor: `${color}20` }
    },
    createElement('span', { className: 'text-lg' }, emoji)
  );
};

export function transformActivityToVisualCard(activity: ActivityItem): StandardHorizontalCardProps {
  const secondaryInfo = getSecondaryInfo(activity.category, activity.title);
  const ctaConfig = getCtaForScreen('D1-001-04');
  
  return {
    id: activity.id,
    screenId: 'AI_FEED_ACTIVITY',
    icon: getCategoryIcon(activity.category, activity.icon),
    title: activity.title,
    description: activity.reason,
    badges: [
      {
        label: activity.status,
        variant: getStatusVariant(activity.status),
        icon: getStatusIcon(activity.status),
      }
    ],
    metadata: [
      { icon: createElement(Award, { className: 'w-3 h-3' }), text: `${secondaryInfo.streak} day streak` },
      { icon: createElement(TrendingUp, { className: 'w-3 h-3' }), text: `+${secondaryInfo.credits} pts earned` },
    ],
    timestamp: fmtDate(new Date(activity.timestamp), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    accentColor: getCategoryColor(activity.category),
    primaryAction: {
      label: ctaConfig.primary.label,
      onClick: () => {
        console.log('[AI Feed] Saving activity to memory:', activity.id);
        notify('toasts.common.activitySavedMemory', 'toasts.common.addedYourKnowledgeBase');
      },
      variant: ctaConfig.primary.variant,
      icon: ctaConfig.primary.icon
    },
    expandOnPrimaryClick: true,
    secondaryActions: [
      {
        label: 'Improve',
        onClick: () => {
          console.log('[AI Feed] Requesting improvement:', activity.id);
          notify('toasts.common.improvementRequested', 'toasts.common.weLlAnalyzeUpdateSuggestionsShortly');
        },
        icon: createElement(TrendingUp, { className: 'w-3 h-3 mr-1' })
      },
      {
        label: 'Hide',
        onClick: () => {
          console.log('[AI Feed] Hiding activity:', activity.id);
          notify('toasts.common.activityHidden');
        },
        icon: createElement(EyeOff, { className: 'w-3 h-3 mr-1' })
      }
    ],
    expandedContent: createElement(
      'div',
      { className: 'space-y-2' },
      createElement('p', { className: 'text-[12px] text-muted-foreground/80 font-medium' }, 'Activity Details'),
      createElement(
        'div',
        { className: 'text-[13px] space-y-1' },
        createElement('p', null, [
          createElement('strong', { key: 'status-label' }, 'Status: '),
          activity.status
        ]),
        createElement('p', null, [
          createElement('strong', { key: 'category-label' }, 'Category: '),
          activity.category
        ]),
        activity.reason && createElement('p', null, [
          createElement('strong', { key: 'reason-label' }, 'Reason: '),
          activity.reason
        ])
      )
    ),
    density: 'compact',
  };
}

export function transformRoutineToVisualCard(
  routine: RoutineItem,
  onToggleRoutine: (routineId: string) => void
): VisualHorizontalCardProps {
  return {
    id: routine.id,
    screenId: 'AI_FEED_ROUTINES',
    imageUrl: routine.image,
    imageAlt: routine.name,
    category: {
      icon: '🔄',
      label: 'Routine',
      color: 'hsl(var(--primary))',
    },
    title: routine.name,
    description: routine.description,
    metadata: [
      { icon: createElement(Award, { className: 'w-3 h-3' }), text: `${routine.streak} day streak` },
      { icon: createElement(TrendingUp, { className: 'w-3 h-3' }), text: `${routine.successRate}% success` },
    ],
    statusBadge: {
      label: routine.active ? 'Active' : 'Paused',
      variant: routine.active ? 'default' : 'secondary',
    },
    rewardPoints: routine.streak > 7 ? 10 : 5,
    expandedContent: createElement(
      'div',
      { className: 'px-4 py-3 border-t border-border/50 flex items-center justify-between' },
      createElement('span', { className: 'text-sm text-muted-foreground' }, routine.frequency)
    ),
    density: 'compact',
  };
}
