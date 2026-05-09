import { format } from "date-fns";
import { NewsCard } from "@/components/crossover/NewsCard";
import { usePersonalizedContent } from "@/hooks/usePersonalizedContent";
import { eventTypeToPillar } from "@/lib/eventTransformers";
import { t } from '@/lib/i18n-toast';

interface HydrationReminderCardProps {
  timeLastIntake?: string;
  className?: string;
}

export function HydrationReminderCard({
  timeLastIntake = "2 hrs since last intake",
  className
}: HydrationReminderCardProps) {
  return (
    <NewsCard
      title={t('screens.context.hydrationReminder')}
      description={`Triggered · ${timeLastIntake}`}
      imageUrl="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop"
      pillar="Hydration"
      author={{ name: "Health Assistant", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Active Alert"
      rewardPoints={3}
      rewardDescription="Complete hydration check for credits"
      showReward={true}
      className={className}
    />
  );
}

interface MorningRoutineCardProps {
  peakTime?: string;
  className?: string;
}

export function MorningRoutineCard({
  peakTime = "8 AM energy peak",
  className
}: MorningRoutineCardProps) {
  return (
    <NewsCard
      title={t('screens.context.morningRoutine')}
      description={`Detected ${peakTime}`}
      imageUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "AI Optimizer", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Optimization"
      rewardPoints={4}
      rewardDescription="Complete morning routine for credits"
      showReward={true}
      className={className}
    />
  );
}

interface UpcomingEventCardProps {
  eventTitle?: string;
  eventTime?: string;
  className?: string;
}

export function UpcomingEventCard({
  eventTitle,
  eventTime,
  className
}: UpcomingEventCardProps) {
  const { upcomingEvents, recommendations } = usePersonalizedContent(3);

  // Prioritize: personalized events → AI recommendations → fallback
  const nextEvent = upcomingEvents.length > 0 
    ? upcomingEvents[0]
    : recommendations.length > 0
    ? recommendations[0]
    : null;
  
  const title = nextEvent?.title || eventTitle || "Healthy Cooking Workshop";
  const time = nextEvent?.time || nextEvent?.date || eventTime || "14:00";
  const pillar = nextEvent?.pillar || "Nutrition";
  const image = nextEvent?.imageUrl || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop";

  return (
    <NewsCard
      title={title}
      description={`Starting at ${time}`}
      imageUrl={image}
      pillar={pillar}
      author={{ name: "Event Calendar", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp={time}
      rewardPoints={8}
      rewardDescription="Join event for participation credits"
      showReward={true}
      className={className}
    />
  );
}

interface SleepCheckCardProps {
  readinessScore?: number;
  className?: string;
}

export function SleepCheckCard({
  readinessScore = 78,
  className
}: SleepCheckCardProps) {
  return (
    <NewsCard
      title={t('screens.context.sleepCheckin')}
      description={`Readiness score tonight: ${readinessScore}`}
      imageUrl="https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop"
      pillar="Sleep"
      author={{ name: "Sleep Tracker", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Evening Check"
      rewardPoints={5}
      rewardDescription="Log sleep data for wellness credits"
      showReward={true}
      className={className}
    />
  );
}

interface CommunitySpotlightCardProps {
  trendingEvent?: string;
  className?: string;
}

export function CommunitySpotlightCard({
  trendingEvent = "Longevity Dance Night 💃",
  className
}: CommunitySpotlightCardProps) {
  return (
    <NewsCard
      title={t('screens.context.communitySpotlight')}
      description={`Trending: ${trendingEvent}`}
      imageUrl="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "Community Events", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Trending Now"
      rewardPoints={6}
      rewardDescription="Join community events for social credits"
      showReward={true}
      className={className}
    />
  );
}

interface EnergyPeakCardProps {
  peakTime?: string;
  className?: string;
}

export function EnergyPeakCard({
  peakTime = "8:00 AM",
  className
}: EnergyPeakCardProps) {
  return (
    <NewsCard
      title={t('screens.context.todaySEnergyPeak')}
      description={`Best time for focus: ${peakTime}`}
      imageUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "Energy Analytics", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Peak Analysis"
      rewardPoints={4}
      rewardDescription="Track energy patterns for wellness credits"
      showReward={true}
      className={className}
    />
  );
}

interface MeditationSuggestionCardProps {
  suggestion?: string;
  className?: string;
}

export function MeditationSuggestionCard({
  suggestion = "Relax 10 min at 6 PM",
  className
}: MeditationSuggestionCardProps) {
  return (
    <NewsCard
      title={t('screens.context.meditationSuggestion')}
      description={suggestion}
      imageUrl="https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "Mindfulness Coach", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Suggested"
      rewardPoints={3}
      rewardDescription="Complete meditation for mindfulness credits"
      showReward={true}
      className={className}
    />
  );
}

interface SleepReadinessCardProps {
  checkTime?: string;
  className?: string;
}

export function SleepReadinessCard({
  checkTime = "10:00 PM",
  className
}: SleepReadinessCardProps) {
  return (
    <NewsCard
      title={t('screens.context.sleepReadiness')}
      description={`Check readiness at ${checkTime}`}
      imageUrl="https://images.unsplash.com/photo-1540331547168-8b63109225b7?w=800&h=600&fit=crop"
      pillar="Sleep"
      author={{ name: "Sleep Optimizer", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Evening"
      rewardPoints={4}
      rewardDescription="Complete sleep prep for rest credits"
      showReward={true}
      className={className}
    />
  );
}