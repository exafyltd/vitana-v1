import { NewsCard } from "@/components/crossover/NewsCard";

interface TodaysPlanCardProps {
  schedule?: string;
  className?: string;
}

export function TodaysPlanCard({
  schedule = "Yoga 7 AM · Workshop 2 PM · Sleep Check 10 PM",
  className
}: TodaysPlanCardProps) {
  return (
    <NewsCard
      title="Today's Plan 🗓️"
      description={schedule}
      imageUrl="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "Daily Schedule", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Today"
      className={className}
    />
  );
}