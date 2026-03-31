import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, Heart, Zap } from "lucide-react";

interface MotivationalBannerProps {
  message?: string;
  userName?: string;
  variant?: "learning" | "adapting" | "celebrating" | "encouraging";
  className?: string;
}

const getBannerConfig = (variant: MotivationalBannerProps["variant"], userName: string) => {
  // Dynamic message rotation - different messages per variant
  const messageRotations = {
    learning: [
      { message: `Your AI is learning from you, ${userName} 🌱`, description: "Every choice helps me understand your preferences better" },
      { message: `AI patterns are emerging from your habits 🧠`, description: "Your routine data is revealing powerful insights" },
      { message: `Machine learning meets human wisdom, ${userName} ✨`, description: "Teaching AI to anticipate your needs perfectly" }
    ],
    adapting: [
      { message: `Autopilot adapts with every choice you make ⚡`, description: "Your patterns are becoming clearer each day" },
      { message: `AI evolution in real-time 🚀`, description: "Customizing automation based on your preferences" },
      { message: `Smart systems learning your rhythm ⚙️`, description: "Personalized AI that grows with you" }
    ],
    celebrating: [
      { message: `Celebrating your consistency, ${userName} ✨`, description: "Your dedication to growth is inspiring" },
      { message: `Victory dance for your progress! 🎉`, description: "Milestones achieved through persistent effort" },
      { message: `Streak master in action 🔥`, description: "Building unstoppable momentum day by day" }
    ],
    encouraging: [
      { message: `Every small step counts, ${userName} 💫`, description: "Building habits that transform your daily life" },
      { message: `Progress is progress, no matter the size 🌟`, description: "Celebrating micro-wins on your journey" },
      { message: `Future you will thank present you 🚀`, description: "Compound growth through consistent action" }
    ]
  };

  const rotationIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 3; // Daily rotation
  const currentRotation = messageRotations[variant || 'encouraging'][rotationIndex];

  switch (variant) {
    case "learning":
      return {
        icon: <Brain className="w-4 h-4 text-purple-600" />,
        message: currentRotation.message,
        description: currentRotation.description,
        gradient: "from-purple-50 via-blue-50 to-indigo-50",
        borderColor: "border-purple-200/50"
      };
    case "adapting":
      return {
        icon: <Zap className="w-4 h-4 text-blue-600" />,
        message: currentRotation.message,
        description: currentRotation.description,
        gradient: "from-blue-50 via-cyan-50 to-teal-50",
        borderColor: "border-blue-200/50"
      };
    case "celebrating":
      return {
        icon: <Heart className="w-4 h-4 text-pink-600" />,
        message: currentRotation.message,
        description: currentRotation.description,
        gradient: "from-pink-50 via-rose-50 to-orange-50",
        borderColor: "border-pink-200/50"
      };
    case "encouraging":
    default:
      return {
        icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
        message: currentRotation.message,
        description: currentRotation.description,
        gradient: "from-emerald-50 via-green-50 to-lime-50",
        borderColor: "border-emerald-200/50"
      };
  }
};

export function MotivationalBanner({ 
  userName = "User",
  variant = "encouraging",
  className = ""
}: MotivationalBannerProps) {
  const config = getBannerConfig(variant, userName);

  return (
    <Card className={`
      bg-gradient-to-r ${config.gradient} 
      border ${config.borderColor} 
      hover:shadow-lg transition-all duration-300 
      ${className}
    `}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white/60 rounded-full">
              {config.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {config.message}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {config.description}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-white/40 backdrop-blur-sm border-white/60">
            AI Insight
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}