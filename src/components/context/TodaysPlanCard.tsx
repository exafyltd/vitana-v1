import { format } from "date-fns";
import { NewsCard } from "@/components/crossover/NewsCard";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";

interface TodaysPlanCardProps {
  schedule?: string;
  className?: string;
}

export function TodaysPlanCard({
  schedule,
  className
}: TodaysPlanCardProps) {
  const { todayEvents } = useCommunityEvents();

  // Generate schedule from real events or use provided/fallback
  const generatedSchedule = todayEvents.length > 0
    ? todayEvents
        .slice(0, 3)
        .map(event => `${event.title} ${format(new Date(event.start_time), 'HH:mm')}`)
        .join(" · ")
    : schedule || "Yoga 07:00 · Workshop 14:00 · Sleep Check 22:00";

  return (
    <NewsCard
      title="Today's Plan 🗓️"
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