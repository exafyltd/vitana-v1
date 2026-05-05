import { CrossoverCard } from "./CrossoverCard";
import { Cloud, Thermometer, Wind, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface EnvironmentalContextCardProps {
  weather?: string;
  temperature?: string;
  airQuality?: "Good" | "Moderate" | "Poor";
  uvIndex?: number;
  className?: string;
}

function EnvironmentalContextCardBase({ 
  weather = "Partly Cloudy",
  temperature = "72°F",
  airQuality = "Good",
  uvIndex = 6,
  className 
}: EnvironmentalContextCardProps) {
  const navigate = useNavigate();

  const getWeatherIcon = () => {
    switch (weather) {
      case "Sunny": return Sun;
      case "Cloudy": return Cloud;
      default: return Cloud;
    }
  };

  const WeatherIcon = getWeatherIcon();

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WeatherIcon className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-sm">{weather}</span>
        </div>
        <div className="flex items-center gap-1">
          <Thermometer className="w-3 h-3 text-red-500" />
          <span className="text-sm font-medium">{temperature}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Wind className="w-3 h-3 text-gray-600" />
          <div>
            <div className="font-medium">{t('screens.crossover.airQuality')}</div>
            <div className={`${airQuality === 'Good' ? 'text-green-600' : airQuality === 'Poor' ? 'text-red-600' : 'text-yellow-600'}`}>
              {airQuality}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sun className="w-3 h-3 text-yellow-600" />
          <div>
            <div className="font-medium">{t('screens.crossover.uvIndex')}</div>
            <div className="text-muted-foreground">{uvIndex}/10</div>
          </div>
        </div>
      </div>

      <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('screens.crossover.perfectConditionsForOutdoorActivities')}
        </p>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Cloud}
      category="health"
      title={t('screens.crossover.environmentContext')}
      subtitle="Weather & air quality impact"
      content={content}
      buttonText="Outdoor Plans"
      onButtonClick={() => navigate('/calendar/events')}
      secondaryButtonText="Weather Details"
      onSecondaryButtonClick={() => console.log("Show detailed weather")}
      className={className}
    />
  );
}

export const EnvironmentalContextCard = withCardId(EnvironmentalContextCardBase, "CT-CX-014", "C-014");