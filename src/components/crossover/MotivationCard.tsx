import { CrossoverCard } from "./CrossoverCard";
import { Heart, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MotivationCardProps {
  quote?: string;
  author?: string;
  hasVideo?: boolean;
  className?: string;
}

export function MotivationCard({ 
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
          <span>Video available</span>
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
      iconVariant="danger"
      title="Daily Motivation"
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