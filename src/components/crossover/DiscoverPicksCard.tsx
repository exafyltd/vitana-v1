import { CrossoverCard } from "./CrossoverCard";
import { Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

interface DiscoverPick {
  title: string;
  type: "doctor" | "service" | "product" | "course" | "event";
  rating?: number;
}

interface DiscoverPicksCardProps {
  picks?: DiscoverPick[];
  className?: string;
}

export function DiscoverPicksCard({ 
  picks,
  className 
}: DiscoverPicksCardProps) {
  const navigate = useNavigate();

  const defaultPicks: DiscoverPick[] = [
    { title: "Dr. Sarah Chen - Wellness", type: "doctor", rating: 4.9 },
    { title: "Mindfulness Course", type: "course", rating: 4.8 },
    { title: "Local Yoga Studio", type: "service", rating: 4.7 }
  ];

  const picksList = picks || defaultPicks;

  const getTypeEmoji = (type: DiscoverPick["type"]) => {
    switch (type) {
      case "doctor": return "👩‍⚕️";
      case "service": return "🏢";
      case "product": return "📦";
      case "course": return "📚";
      case "event": return "🎉";
      default: return "✨";
    }
  };

  const content = (
    <div className="space-y-2">
      {picksList.slice(0, 2).map((pick, index) => (
        <div key={index} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span>{getTypeEmoji(pick.type)}</span>
            <span className="font-medium truncate">{pick.title}</span>
          </div>
          {pick.rating && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Star className="w-3 h-3 fill-current" />
              <span>{pick.rating}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <CrossoverCard
      icon={Sparkles}
      category="vitana"
      title={t('screens.crossover.personalizedDiscoveries')}
      subtitle="AI-curated recommendations perfect for your wellness journey"
      content={content}
      buttonText="Explore"
      onButtonClick={() => navigate('/discover')}
      secondaryButtonText="Save for Later"
      onSecondaryButtonClick={() => navigate('/discover/saved')}
      className={className}
    />
  );
}