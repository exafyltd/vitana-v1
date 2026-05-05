import { CrossoverCard } from "./CrossoverCard";
import { Globe, MapPin, Battery } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface CurrentVibeCardProps {
  location?: string;
  mood?: string;
  sleepScore?: number;
  stressLevel?: "Low" | "Medium" | "High";
  className?: string;
}

function CurrentVibeCardBase({ 
  location = "Downtown",
  mood = "😊 Energetic",
  sleepScore = 85,
  stressLevel = "Low",
  className 
}: CurrentVibeCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-medium">{location}</span>
        </div>
        <div className="text-right">
          <div className="font-medium">{mood}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Battery className="w-3 h-3 text-green-600" />
          <div>
            <div className="font-medium">{t('screens.crossover.sleepScore')}</div>
            <div className="text-muted-foreground">{sleepScore}/100</div>
          </div>
        </div>
        <div>
          <div className="font-medium">{t('screens.crossover.stressLevel')}</div>
          <div className={`text-muted-foreground ${stressLevel === 'Low' ? 'text-green-600' : stressLevel === 'High' ? 'text-red-600' : 'text-yellow-600'}`}>
            {stressLevel}
          </div>
        </div>
      </div>

      <div className="w-full bg-secondary/30 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all" 
          style={{ width: `${sleepScore}%` }}
        />
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Globe}
      category="mental"
      title={t('screens.crossover.myCurrentVibe')}
      subtitle="Location, mood & wellness snapshot"
      content={content}
      buttonText="Edit Mood"
      onButtonClick={() => navigate('/health/tracker')}
      secondaryButtonText="Update Status"
      onSecondaryButtonClick={() => navigate('/settings/preferences')}
      className={className}
    />
  );
}

export const CurrentVibeCard = withCardId(CurrentVibeCardBase, "CT-CX-011", "C-011");