import { CrossoverCard } from "./CrossoverCard";
import { Heart, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface MotivationCardProps {
  quote?: string;
  author?: string;
  hasVideo?: boolean;
  className?: string;
}

function MotivationCardBase({ 
  quote = "Every small step towards wellness is a victory worth celebrating.",
  author = "Today's Inspiration",
  hasVideo = false,
  className 
}: MotivationCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3 text-center">
      <blockquote className="text-sm italic text-foreground leading-relaxed">
        "{quote}"
      </blockquote>
      <p className="text-xs text-muted-foreground">— {author}</p>
      
      {hasVideo && (
        <div className="flex items-center justify-center gap-1 text-xs text-blue-600">
          <Play className="w-3 h-3" />
          <span>{t('screens.crossover.videoAvailable')}</span>
        </div>
      )}
    </div>
  );

  const handleTryNow = () => {
    // In real implementation, this would trigger the motivational action
    console.log("Motivational action triggered");
  };

  return (
    <CrossoverCard
      icon={Heart}
      category="mental"
      title={t('screens.crossover.dailyMotivation')}
      subtitle="Inspirational content to fuel your wellness journey"
      content={content}
      buttonText="Try Now"
      onButtonClick={handleTryNow}
      secondaryButtonText="More Inspiration"
      onSecondaryButtonClick={() => navigate('/community/media-hub')}
      className={className}
    />
  );
}

export const MotivationCard = withCardId(MotivationCardBase, "CT-CX-007", "C-007");