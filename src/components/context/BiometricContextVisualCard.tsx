import { NewsCard } from "@/components/crossover/NewsCard";
import { t } from '@/lib/i18n-toast';

interface BiometricContextVisualCardProps {
  heartRate?: number;
  steps?: number;
  hydration?: number;
  energy?: number;
  className?: string;
}

export function BiometricContextVisualCard({
  heartRate = 68,
  steps = 8420,
  hydration = 75,
  energy = 82,
  className
}: BiometricContextVisualCardProps) {
  return (
    <NewsCard
      title={t('screens.context.biometricContext')}
      description={`HR ${heartRate} BPM · ${steps.toLocaleString()} Steps · Hydration ${hydration}% · Energy ${energy}%`}
      imageUrl="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop"
      pillar="Exercise"
      author={{ name: "Health Metrics", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Live Data"
      rewardPoints={7}
      rewardDescription="Share biometric data for health credits"
      showReward={true}
      className={className}
    />
  );
}