import { CrossoverCard } from "./CrossoverCard";
import { Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VitanaIndexCardProps {
  score?: number;
  trend?: string;
  className?: string;
}

export function VitanaIndexCard({ 
  score = 742, 
  trend = "+11% vs last week",
  className 
}: VitanaIndexCardProps) {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 700) return "text-green-600";
    if (score >= 500) return "text-yellow-600";
    return "text-red-600";
  };

  const content = (
    <div className="flex flex-col items-center">
      <div className="relative mb-3">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20">
          <span className={cn("text-3xl font-bold", getScoreColor(score))}>{score}</span>
        </div>
      </div>
      <p className="text-xs text-green-600 font-medium">{trend}</p>
    </div>
  );

  return (
    <CrossoverCard
      icon={Scale}
      iconColor="text-primary"
      title="Vitana Index ⚖️"
      subtitle="Your Balance Score"
      content={content}
      buttonText="View Details"
      onButtonClick={() => navigate('/health-tracker/vitana-index')}
      className={className}
    />
  );
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}