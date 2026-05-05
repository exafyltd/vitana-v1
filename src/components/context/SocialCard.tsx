import { NewsCard } from "@/components/crossover/NewsCard";
import { t } from '@/lib/i18n-toast';

interface SocialCardProps {
  activeFriends?: string;
  upcomingEvent?: string;
  className?: string;
}

export function SocialCard({
  activeFriends = "Sarah & 3 friends active now",
  upcomingEvent = "Meetup in 2 hrs",
  className
}: SocialCardProps) {
  return (
    <NewsCard
      title={t('screens.context.social')}
      description={`${activeFriends} · ${upcomingEvent}`}
      imageUrl="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "Community Hub", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Live Activity"
      className={className}
    />
  );
}