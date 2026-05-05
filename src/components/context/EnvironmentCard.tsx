import { NewsCard } from "@/components/crossover/NewsCard";
import { t } from '@/lib/i18n-toast';

interface EnvironmentCardProps {
  location?: string;
  temperature?: number;
  weather?: string;
  className?: string;
}

export function EnvironmentCard({
  location = "Downtown",
  temperature = 23,
  weather = "Cloudy",
  className
}: EnvironmentCardProps) {
  const getWeatherImage = (weather: string) => {
    switch (weather.toLowerCase()) {
      case 'sunny':
        return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop";
      case 'cloudy':
        return "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop";
      case 'rainy':
        return "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&h=600&fit=crop";
      default:
        return "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=600&fit=crop";
    }
  };

  return (
    <NewsCard
      title={t('screens.context.environment')}
      description={`${location} · ${temperature}°C · ${weather}`}
      imageUrl={getWeatherImage(weather)}
      pillar="Mental"
      author={{ name: "Weather Data", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      location={location}
      timestamp="Current"
      className={className}
    />
  );
}