import React from 'react';
import { AutopilotAction, AutopilotCategory, AutopilotPriority } from '@/types/autopilot';
import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { StandardHorizontalCardProps } from '@/components/ui/standard-horizontal-card';
import { 
  Clock, 
  Zap, 
  Target, 
  Check, 
  X, 
  UserPlus, 
  Calendar, 
  Play, 
  FileText, 
  Rocket, 
  Eye,
  Star,
  Sparkles,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

// Import action images
import communityDanceImage from '@/assets/actions/community-dance-group.jpg';
import doctorBiomarkerImage from '@/assets/actions/doctor-biomarker-review.jpg';
import aiNeuralImage from '@/assets/actions/ai-neural-patterns.jpg';
import friendsMeetupImage from '@/assets/actions/friends-meetup-selfie.jpg';
import hydrationBottleImage from '@/assets/actions/hydration-water-bottle.jpg';
import wellnessYogaImage from '@/assets/actions/wellness-yoga-nature.jpg';
import { t } from '@/lib/i18n-toast';

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
 * Get contextual CTA label and icon based on action type or title
 */
export function getContextualCta(action: AutopilotAction): { label: string; icon: React.ReactNode } {
  // Use explicit CTA label if provided
  if (action.ctaLabel) {
    return {
      label: action.ctaLabel,
      icon: <Check className="w-4 h-4" />
    };
  }

  // Use actionType if provided
  if (action.actionType) {
    switch (action.actionType.toLowerCase()) {
      case 'join':
        return { label: 'Join', icon: <UserPlus className="w-4 h-4" /> };
      case 'book':
        return { label: 'Book Now', icon: <Calendar className="w-4 h-4" /> };
      case 'watch':
        return { label: 'Watch', icon: <Play className="w-4 h-4" /> };
      case 'review':
        return { label: 'Review', icon: <FileText className="w-4 h-4" /> };
      case 'start':
        return { label: 'Start', icon: <Rocket className="w-4 h-4" /> };
      case 'schedule':
        return { label: 'Schedule', icon: <Calendar className="w-4 h-4" /> };
      case 'connect':
        return { label: 'Connect', icon: <UserPlus className="w-4 h-4" /> };
      case 'explore':
        return { label: 'Explore', icon: <Sparkles className="w-4 h-4" /> };
    }
  }

  // Smart detection based on title keywords
  const title = action.title.toLowerCase();
  
  if (title.includes('join') || title.includes('group') || title.includes('squad')) {
    return { label: 'Join', icon: <UserPlus className="w-4 h-4" /> };
  }
  if (title.includes('book') || title.includes('appointment') || title.includes('schedule')) {
    return { label: 'Book', icon: <Calendar className="w-4 h-4" /> };
  }
  if (title.includes('watch') || title.includes('video') || title.includes('stream')) {
    return { label: 'Watch', icon: <Play className="w-4 h-4" /> };
  }
  if (title.includes('review') || title.includes('biomarker') || title.includes('results') || title.includes('report')) {
    return { label: 'Review', icon: <FileText className="w-4 h-4" /> };
  }
  if (title.includes('start') || title.includes('begin') || title.includes('challenge')) {
    return { label: 'Start', icon: <Rocket className="w-4 h-4" /> };
  }
  if (title.includes('invite') || title.includes('meetup')) {
    return { label: 'Send Invites', icon: <UserPlus className="w-4 h-4" /> };
  }
  if (title.includes('insight') || title.includes('discover') || title.includes('breakthrough')) {
    return { label: 'View Insight', icon: <Sparkles className="w-4 h-4" /> };
  }
  if (title.includes('streak') || title.includes('track')) {
    return { label: 'Log It', icon: <Check className="w-4 h-4" /> };
  }

  // Fallback based on category
  switch (action.category) {
    case 'community':
      return { label: 'Connect', icon: <UserPlus className="w-4 h-4" /> };
    case 'calendar':
      return { label: 'Schedule', icon: <Calendar className="w-4 h-4" /> };
    case 'media':
      return { label: 'Watch', icon: <Play className="w-4 h-4" /> };
    case 'health':
      return { label: 'Take Action', icon: <Star className="w-4 h-4" /> };
    default:
      return { label: 'View Details', icon: <Eye className="w-4 h-4" /> };
  }
}

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
  const motivationalHook = getMotivationalHook(action);
  const { variant: priorityVariant, label: priorityLabel } = getPriorityBadge(action.priority);
  const contextualCta = getContextualCta(action);

  // Get subtle shadow based on priority
  const priorityShadow = {
    high: 'shadow-lg shadow-red-500/10',
    medium: 'shadow-md shadow-amber-500/8',
    low: 'shadow-sm'
  }[action.priority];

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
    className: priorityShadow,
    // PRIMARY ACTION: Contextual CTA (e.g., "Join", "Book", "Watch")
    primaryAction: onExecute
      ? {
          label: contextualCta.label,
          icon: contextualCta.icon,
          onClick: () => onExecute(action.id),
          variant: 'default',
        }
      : undefined,
    // NO SECONDARY ACTION on collapsed card - Dismiss only in expanded content
    secondaryAction: undefined,
    expandedContent: (
      <div className="space-y-4 p-4">
        {/* Why this action */}
        <div>
          <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {t('screens.common.whyThisAction')}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{action.reason}</p>
        </div>

        {/* Time estimate */}
        {action.timeEstimate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{t('screens.common.timeNeeded')} <span className="font-medium text-foreground">{action.timeEstimate}</span></span>
          </div>
        )}

        {/* Priority indicator */}
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span className="text-muted-foreground">{t('screens.common.priority')} <span className="font-medium text-foreground">{action.priority.toUpperCase()}</span></span>
        </div>

        {/* Expected outcome */}
        <div>
          <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            {t('screens.common.expectedOutcome')}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {action.category === 'community' && 'Connect with like-minded individuals, strengthen social wellness, and expand your longevity network.'}
            {action.category === 'health' && 'Improve your health metrics, build sustainable habits, and optimize your longevity journey.'}
            {action.category === 'media' && 'Gain valuable insights, learn proven strategies, and discover new approaches to wellness.'}
            {action.category === 'discover' && 'Discover curated products and services that align with your longevity goals.'}
            {action.category === 'calendar' && 'Stay organized, optimize your schedule, and never miss important wellness activities.'}
          </p>
        </div>

        {/* Action buttons - horizontal layout */}
        <div className="flex gap-2 pt-2 border-t border-border/50">
          {/* PRIMARY CTA */}
          {onExecute && (
            <button
              onClick={() => onExecute(action.id)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {contextualCta.icon}
              {contextualCta.label}
            </button>
          )}
          
          {/* DISMISS (subtle, ghost) */}
          {onDismiss && (
            <button
              onClick={() => onDismiss(action.id)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >{t('screens.common.notInterested')}
            </button>
          )}
        </div>
      </div>
    ),
  };
}

/**
 * Transforms AutopilotAction[] to StandardHorizontalCardProps[]
 */
export function transformAutopilotActionsToStandardCards(
  actions: AutopilotAction[],
  screenId: string = 'home_actions',
  onExecute?: (actionId: string) => void,
  onDismiss?: (actionId: string) => void
): StandardHorizontalCardProps[] {
  return actions.map((action) => {
    const cta = getContextualCta(action);
    
    // Map priority to badge
    const priorityBadge = action.priority === 'high' 
      ? { label: '🔴 High', variant: 'destructive' as const }
      : action.priority === 'medium'
      ? { label: '🟡 Medium', variant: 'default' as const }
      : { label: '🟢 Low', variant: 'secondary' as const };
    
    return {
      id: action.id,
      screenId,
      icon: getCategoryIcon(action.category),
      title: action.title,
      description: action.reason,
      badges: [
        { label: getCategoryLabel(action.category), variant: 'outline' as const },
        priorityBadge
      ],
      timestamp: action.timestamp,
      primaryAction: onExecute ? {
        label: cta.label,
        icon: cta.icon,
        onClick: () => onExecute(action.id)
      } : undefined,
      secondaryActions: onDismiss ? [
        {
          label: 'Dismiss',
          icon: <X className="w-4 h-4" />,
          onClick: () => onDismiss(action.id)
        }
      ] : undefined,
      expandedContent: (
        <div className="space-y-4 px-4 py-3">
          {/* Why this action section */}
          <div>
            <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('screens.common.whyThisAction')}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{action.reason}</p>
          </div>

          {/* Time estimate */}
          {action.timeEstimate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{t('screens.common.timeNeeded')} <span className="font-medium text-foreground">{action.timeEstimate}</span></span>
            </div>
          )}

          {/* Priority indicator */}
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span className="text-muted-foreground">{t('screens.common.priority')} <span className="font-medium text-foreground">{action.priority.toUpperCase()}</span></span>
          </div>

          {/* Expected outcome */}
          <div>
            <h4 className="font-semibold text-sm mb-1.5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              {t('screens.common.expectedOutcome')}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {action.category === 'community' && 'Connect with like-minded individuals, strengthen social wellness, and expand your longevity network.'}
              {action.category === 'health' && 'Improve your health metrics, build sustainable habits, and optimize your longevity journey.'}
              {action.category === 'media' && 'Gain valuable insights, learn proven strategies, and discover new approaches to wellness.'}
              {action.category === 'discover' && 'Discover curated products and services that align with your longevity goals.'}
              {action.category === 'calendar' && 'Stay organized, optimize your schedule, and never miss important wellness activities.'}
            </p>
          </div>

          {/* Action metadata */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('screens.common.actionIdValue0', { value0: action.id.slice(0, 8) })}</span>
            <span>{getCategoryLabel(action.category)}</span>
          </div>
        </div>
      )
    };
  });
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
