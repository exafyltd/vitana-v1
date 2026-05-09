import { NewsCard } from "@/components/crossover/NewsCard";
import { t } from '@/lib/i18n-toast';

interface MyCurrentVibeCardProps {
  mood?: string;
  energyLevel?: string;
  stressLevel?: string;
  sleepScore?: number;
  location?: string;
  className?: string;
}

export function MyCurrentVibeCard({
  mood = "Energetic",
  energyLevel = "High",
  stressLevel = "Low Stress",
  sleepScore = 85,
  location = "Downtown",
  className
}: MyCurrentVibeCardProps) {
  const getMoodEmoji = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'energetic': return '⚡';
      case 'calm': return '😌';
      case 'focused': return '🎯';
      case 'happy': return '😊';
      default: return '🌟';
    }
  };

  const getLocationImage = (location: string) => {
    // Dynamic cityscape/nature based on location
    if (location.toLowerCase().includes('downtown') || location.toLowerCase().includes('city')) {
      return "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop";
    }
    return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop";
  };

  return (
    <NewsCard
      title={t('screens.context.myCurrentVibe')}
      description={`${getMoodEmoji(mood)} ${mood} · ${energyLevel} Energy · ${stressLevel} · Sleep Score ${sleepScore}/100`}
      imageUrl={getLocationImage(location)}
      pillar="Mental"
      author={{ name: "Current Status", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      location={location}
      timestamp="Now"
      className={className}
    />
  );
}