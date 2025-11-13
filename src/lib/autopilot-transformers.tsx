import React from 'react';
import { AutopilotAction, AutopilotCategory, AutopilotPriority } from '@/types/autopilot';
import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { Clock, Zap, Target, Check, X } from 'lucide-react';

// Import action images
import communityDanceImage from '@/assets/actions/community-dance-group.jpg';
import doctorBiomarkerImage from '@/assets/actions/doctor-biomarker-review.jpg';
import aiNeuralImage from '@/assets/actions/ai-neural-patterns.jpg';
import friendsMeetupImage from '@/assets/actions/friends-meetup-selfie.jpg';
import hydrationBottleImage from '@/assets/actions/hydration-water-bottle.jpg';
import wellnessYogaImage from '@/assets/actions/wellness-yoga-nature.jpg';

/**
 * Maps autopilot category to domain accent color from design system
 */
const getCategoryAccent = (category: AutopilotCategory): string => {
  switch (category) {
    case 'health':
      return 'hsl(var(--pill-hydration-accent))';
    case 'community':
      return 'hsl(var(--domain-community-accent))';
    case 'media':
      return 'hsl(var(--pill-nutrition-accent))';
    case 'discover':
      return 'hsl(var(--domain-discover-accent))';
    case 'calendar':
      return 'hsl(var(--util-calendar-accent))';
    default:
      return 'hsl(var(--domain-community-accent))';
  }
};

/**
 * Maps category to icon
 */
const getCategoryIcon = (category: AutopilotCategory): string => {
  switch (category) {
    case 'health':
      return '💚';
    case 'community':
      return '👥';
    case 'media':
      return '🎧';
    case 'discover':
      return '🛍️';
    case 'calendar':
      return '📅';
    default:
      return '⭐';
  }
};

/**
 * Maps category to label
 */
const getCategoryLabel = (category: AutopilotCategory): string => {
  switch (category) {
    case 'health':
      return 'Health';
    case 'community':
      return 'Community';
    case 'media':
      return 'Media';
    case 'discover':
      return 'Discover';
    case 'calendar':
      return 'Calendar';
    default:
      return 'General';
  }
};

/**
 * Gets image for action based on category or specific imageUrl
 */
const getImageForAction = (action: AutopilotAction): string => {
  // Use specific image if provided
  if (action.imageUrl) {
    const imageMap: { [key: string]: string } = {
      '/src/assets/actions/community-dance-group.jpg': communityDanceImage,
      '/src/assets/actions/doctor-biomarker-review.jpg': doctorBiomarkerImage,
      '/src/assets/actions/ai-neural-patterns.jpg': aiNeuralImage,
      '/src/assets/actions/friends-meetup-selfie.jpg': friendsMeetupImage,
      '/src/assets/actions/hydration-water-bottle.jpg': hydrationBottleImage,
      '/src/assets/actions/wellness-yoga-nature.jpg': wellnessYogaImage,
    };
    return imageMap[action.imageUrl] || communityDanceImage;
  }
  
  // Fallback to category-based image
  switch (action.category) {
    case 'community':
      return communityDanceImage;
    case 'health':
      return action.title.toLowerCase().includes('biomarker') || action.title.toLowerCase().includes('doctor')
        ? doctorBiomarkerImage
        : hydrationBottleImage;
    case 'media':
      return wellnessYogaImage;
    case 'discover':
      return aiNeuralImage;
    case 'calendar':
      return wellnessYogaImage;
    default:
      return communityDanceImage;
  }
};

/**
 * Generates motivational hook based on action context
 */
const getMotivationalHook = (action: AutopilotAction): string => {
  const { title } = action;
  
  if (title.toLowerCase().includes('dance')) {
    return 'Dance tonight = smiles guaranteed 💃✨';
  }
  if (title.toLowerCase().includes('hydration') || title.toLowerCase().includes('water')) {
    return 'Your streak is legendary — one more day! 🔥';
  }
  if (title.toLowerCase().includes('energy') || title.toLowerCase().includes('peak')) {
    return 'Perfect timing for your 8 AM energy peak ⚡';
  }
  if (title.toLowerCase().includes('biomarker') || title.toLowerCase().includes('results')) {
    return 'Your numbers are ready to reveal insights 📊';
  }
  if (title.toLowerCase().includes('video') || title.toLowerCase().includes('watch')) {
    return 'This video could upgrade your routine 🎬';
  }
  
  // Generic fallback
  return `Let's make today count! 🚀`;
};

/**
 * Maps priority to status badge variant
 */
const getPriorityBadge = (priority: AutopilotPriority): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } => {
  switch (priority) {
    case 'high':
      return { label: 'High Priority', variant: 'destructive' };
    case 'medium':
      return { label: 'Medium', variant: 'default' };
    case 'low':
      return { label: 'Low', variant: 'secondary' };
  }
};

/**
 * Transforms AutopilotAction to VisualHorizontalCardProps for standardized rendering
 */
export function transformAutopilotActionToVisualCard(
  action: AutopilotAction,
  screenId: string = 'home_actions',
  onExecute?: (actionId: string) => void,
  onDismiss?: (actionId: string) => void
): VisualHorizontalCardProps {
  return {
    id: action.id,
    screenId,
    imageUrl: getImageForAction(action),
    imageAlt: action.title,
    mediaAspect: '16:9',
    category: {
      icon: getCategoryIcon(action.category),
      label: getCategoryLabel(action.category),
      color: getCategoryAccent(action.category),
    },
    title: action.title,
    description: action.reason,
    motivationalHook: getMotivationalHook(action),
    metadata: [
      {
        icon: <Clock className="w-3.5 h-3.5" />,
        text: action.timeEstimate || 'Quick action',
      },
    ],
    statusBadge: getPriorityBadge(action.priority),
    timestamp: action.timestamp,
    statusDot: action.status === 'completed' ? 'success' : action.status === 'failed' ? 'error' : 'info',
    density: 'compact',
    analyticsCategory: action.category,
    primaryAction: onExecute
      ? {
          label: 'Take Action',
          icon: <Check className="w-4 h-4 mr-1" />,
          onClick: () => onExecute(action.id),
          variant: 'default',
        }
      : undefined,
    secondaryAction: onDismiss
      ? {
          label: 'Dismiss',
          icon: <X className="w-4 h-4 mr-1" />,
          onClick: () => onDismiss(action.id),
          variant: 'ghost',
        }
      : undefined,
    expandedContent: action.timeEstimate ? (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="font-medium">Expected Outcome:</span>
          <span className="text-muted-foreground">Complete this action to boost your {getCategoryLabel(action.category)} score</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="font-medium">Time Required:</span>
          <span className="text-muted-foreground">{action.timeEstimate}</span>
        </div>
      </div>
    ) : undefined,
  };
}

/**
 * Transforms an array of AutopilotActions to VisualHorizontalCardProps[]
 */
export function transformAutopilotActionsToVisualCards(
  actions: AutopilotAction[],
  screenId: string = 'home_actions',
  onExecute?: (actionId: string) => void,
  onDismiss?: (actionId: string) => void
): VisualHorizontalCardProps[] {
  return actions.map(action => transformAutopilotActionToVisualCard(action, screenId, onExecute, onDismiss));
}
