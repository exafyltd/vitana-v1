import { NewsCard } from "@/components/crossover/NewsCard";
import { t } from '@/lib/i18n-toast';

interface MotivationBannerCardProps {
  userName?: string;
  message?: string;
  className?: string;
}

export function MotivationBannerCard({
  userName = "Jovana",
  message = "your energy is on point today ⚡",
  className
}: MotivationBannerCardProps) {
  return (
    <NewsCard
      title={t('screens.context.dailyMotivation')}
      description={`${userName}, ${message}`}
      imageUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "VITANA AI", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Personalized"
      className={className}
    />
  );
}