import { CrossoverCard } from "./CrossoverCard";
import { Brain, Lightbulb, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface AIReasoningCardProps {
  reasoning?: string;
  confidence?: number;
  factors?: string[];
  className?: string;
}

function AIReasoningCardBase({ 
  reasoning = "Because you slept late, I softened your workout and added a recovery session.",
  confidence = 87,
  factors = ["Sleep Quality", "Stress Level", "Previous Activity"],
  className 
}: AIReasoningCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      <div className="p-3 bg-secondary/20 rounded-lg">
        <p className="text-sm italic text-foreground leading-relaxed">
          "{reasoning}"
        </p>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span>{t('screens.crossover.confidenceConfidence', { confidence })}</span>
        </div>
        <Lightbulb className="w-3 h-3 text-yellow-600" />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t('screens.crossover.keyFactors')}</p>
        <div className="flex flex-wrap gap-1">
          {factors.map((factor, index) => (
            <span 
              key={index} 
              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
            >
              {factor}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Brain}
      category="mental"
      title={t('screens.crossover.whyItMatters')}
      subtitle="AI reasoning behind recommendations"
      content={content}
      buttonText="Makes Sense"
      onButtonClick={() => console.log("User approved AI reasoning")}
      secondaryButtonText="Change Rule"
      onSecondaryButtonClick={() => navigate('/ai/agent-prompt-center')}
      className={className}
    />
  );
}

export const AIReasoningCard = withCardId(AIReasoningCardBase, "CT-CX-012", "C-012");