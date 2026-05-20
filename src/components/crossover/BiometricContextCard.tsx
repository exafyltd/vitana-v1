import { CrossoverCard } from "./CrossoverCard";
import { Activity, Heart, Droplets, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
interface BiometricContextCardProps {
  heartRate?: number;
  steps?: number;
  hydration?: number;
  energy?: number;
  className?: string;
}

function BiometricContextCardBase({ 
  heartRate = 68,
  steps = 8420,
  hydration = 75,
  energy = 82,
  className 
}: BiometricContextCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          <div>
            <div className="font-medium">{t('screens.crossover.heartrateBpm', { heartRate })}</div>
            <div className="text-xs text-muted-foreground">{t('screens.crossover.restingHr')}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <div>
            <div className="font-medium">{fmtDateTime(steps)}</div>
            <div className="text-xs text-muted-foreground">{t('screens.crossover.stepsToday')}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Droplets className="w-3 h-3 text-blue-500" />
            <span>{t('screens.crossover.hydrationHydration', { hydration })}</span>
          </div>
          <div className="w-16 bg-secondary/30 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all" 
              style={{ width: `${hydration}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>{t('screens.crossover.energyEnergy', { energy })}</span>
          </div>
          <div className="w-16 bg-secondary/30 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-yellow-500 to-green-500 h-1 rounded-full transition-all" 
              style={{ width: `${energy}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Activity}
      category="health"
      title={t('screens.crossover.biometricContext')}
      subtitle="Real-time health metrics"
      content={content}
      buttonText="Track More"
      onButtonClick={() => navigate('/health/tracker')}
      secondaryButtonText="View Trends"
      onSecondaryButtonClick={() => navigate('/health/biomarker-results')}
      className={className}
    />
  );
}

export const BiometricContextCard = withCardId(BiometricContextCardBase, "CT-CX-016", "C-016");