import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles, Brain, Zap } from "lucide-react";

// Import AI neural insights image
import aiNeuralInsightsImg from "@/assets/ai-feed/ai-neural-insights.jpg";
import meditationMindfulnessImg from "@/assets/ai-feed/meditation-mindfulness.jpg";
import { t } from '@/lib/i18n-toast';

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  category: "optimization" | "wellness" | "social" | "productivity";
  confidence: number;
  timeEstimate?: string;
  icon: string;
  glowColor: string;
  image?: string;
}

interface GlowingSuggestionsGridProps {
  suggestions?: AISuggestion[];
  onTrySuggestion?: (suggestionId: string) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
}

const defaultSuggestions: AISuggestion[] = [
  {
    id: "morning-optimization",
    title: "Morning Routine Optimization",
    description: "Want me to optimize your morning routine? I noticed you're most energetic at 8 AM and could benefit from a structured flow.",
    category: "optimization",
    confidence: 89,
    timeEstimate: "5 min setup",
    icon: "⚡",
    glowColor: "from-blue-400/20 to-cyan-400/20",
    image: aiNeuralInsightsImg
  },
  {
    id: "meditation-suggestion",
    title: "Evening Meditation Flow",
    description: "AI suggests adding 10-minute evening meditation. Your stress patterns show this could improve sleep quality by 23%.",
    category: "wellness",
    confidence: 76,
    timeEstimate: "10 min daily",
    icon: "🧘",
    glowColor: "from-purple-400/20 to-pink-400/20",
    image: meditationMindfulnessImg
  },
  {
    id: "social-connection",
    title: "Social Connection Boost",
    description: "I can schedule weekly friend check-ins based on your calendar gaps. Research shows this increases wellbeing by 31%.",
    category: "social",
    confidence: 82,
    timeEstimate: "2 min setup",
    icon: "👫",
    glowColor: "from-green-400/20 to-emerald-400/20",
    image: aiNeuralInsightsImg
  },
  {
    id: "stress-detection",
    title: "Proactive Stress Management",
    description: "Let me track patterns and suggest micro-breaks before you feel overwhelmed. AI-powered early intervention.",
    category: "productivity",
    confidence: 91,
    timeEstimate: "Automatic",
    icon: "🎯",
    glowColor: "from-orange-400/20 to-red-400/20",
    image: aiNeuralInsightsImg
  }
];

const getCategoryIcon = (category: AISuggestion["category"]) => {
  switch (category) {
    case "optimization": return <Zap className="w-4 h-4" />;
    case "wellness": return <Sparkles className="w-4 h-4" />;
    case "social": return <Brain className="w-4 h-4" />;
    case "productivity": return <Lightbulb className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: AISuggestion["category"]) => {
  switch (category) {
    case "optimization": return "text-blue-600 bg-blue-100";
    case "wellness": return "text-purple-600 bg-purple-100";
    case "social": return "text-green-600 bg-green-100";
    case "productivity": return "text-orange-600 bg-orange-100";
  }
};

export function GlowingSuggestionsGrid({ 
  suggestions = defaultSuggestions,
  onTrySuggestion,
  onDismissSuggestion 
}: GlowingSuggestionsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className={`
          relative bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-2xl 
          transition-all duration-500 group overflow-hidden
          hover:scale-[1.02] hover:border-primary/30
        `}>
          {/* Glow effect */}
          <div className={`
            absolute inset-0 bg-gradient-to-br ${suggestion.glowColor} 
            opacity-0 group-hover:opacity-100 transition-opacity duration-500
            blur-xl transform scale-110
          `} />
          
          {/* Content */}
          <CardContent className="relative p-0">
            <div className="flex h-48">
              {/* Left: Neural pattern image */}
              <div className="relative w-40 flex-shrink-0 overflow-hidden rounded-l-lg">
                <img 
                  src={suggestion.image || aiNeuralInsightsImg}
                  alt={suggestion.title}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-300"
                />
                {/* Enhanced animated overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent group-hover:from-primary/20 transition-colors duration-300" />
                
                {/* Standardized AI indicator - top-left */}
                <div className="absolute top-3 left-3">
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                    <Brain className="w-3 h-3 text-white animate-pulse" />
                    <span className="text-xs font-medium text-white">AI</span>
                  </div>
                </div>

                {/* Confidence badge */}
                <div className="absolute bottom-3 left-3">
                  <Badge variant="secondary" className="text-xs bg-white/20 backdrop-blur-sm border-white/30 text-white shadow-lg">
                    {suggestion.confidence}% confident
                  </Badge>
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{suggestion.icon}</span>
                      <Badge className={`text-xs ${getCategoryColor(suggestion.category)}`}>
                        {getCategoryIcon(suggestion.category)}
                        {suggestion.category}
                      </Badge>
                    </div>
                    {suggestion.timeEstimate && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.timeEstimate}
                      </Badge>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-sm mb-2 text-foreground leading-tight">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button 
                    size="sm" 
                    onClick={() => onTrySuggestion?.(suggestion.id)}
                    className="flex-1 h-9 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {t('screens.ai-feed.tryIt')}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onDismissSuggestion?.(suggestion.id)}
                    className="h-9 bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          
          {/* Subtle pulse animation for emphasis */}
          <div className="absolute inset-0 rounded-lg ring-1 ring-primary/20 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-500" />
        </Card>
      ))}
    </div>
  );
}