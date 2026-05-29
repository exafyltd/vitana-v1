import { NewsCard } from "@/components/crossover/NewsCard";
import { usePersonalizedContent } from "@/hooks/usePersonalizedContent";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface TodaysPlanCardProps {
  schedule?: string;
  className?: string;
}

export function TodaysPlanCard({
  schedule,
  className
}: TodaysPlanCardProps) {
  const { todayEvents, recommendations, loading } = usePersonalizedContent(3);

  // Prioritize: personalized events → AI recommendations → fallback
  const displayEvents = todayEvents.length > 0 
    ? todayEvents 
    : recommendations.length > 0 
    ? recommendations 
    : [];

  const generatedSchedule = displayEvents.length > 0
    ? displayEvents
        .slice(0, 3)
        .map(event => `${event.title} ${event.time}`)
        .join(" · ")
    : schedule || "Yoga 07:00 · Workshop 14:00 · Sleep Check 22:00";

  return (
    <NewsCard
      title={t('screens.context.todaySPlan')}
      description={generatedSchedule}
      imageUrl="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "Daily Schedule", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Today"
      rewardPoints={6}
      rewardDescription="Complete daily plan for organization credits"
      showReward={true}
      className={className}
    />
  );
}