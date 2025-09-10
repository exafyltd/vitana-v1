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
  const messages = {
    learning: [
      { message: `Your AI is learning from you, ${userName} 🌱`, description: "Every choice helps me understand your preferences better" },
      { message: `${userName}, you're teaching me so well ✨`, description: "Each interaction makes our connection stronger" },
      { message: `Learning your patterns, ${userName} 🧠`, description: "Building a personalized experience just for you" }
    ],
    adapting: [
      { message: `Autopilot adapts with every choice you make ⚡`, description: "Your patterns are becoming clearer each day" },
      { message: `Fine-tuning for your lifestyle, ${userName} 🎯`, description: "Optimizing recommendations based on your habits" },
      { message: `Your AI is evolving with you ⚡`, description: "Becoming smarter with every interaction" }
    ],
    celebrating: [
      { message: `Celebrating your consistency, ${userName} ✨`, description: "Your dedication to growth is inspiring" },
      { message: `Amazing progress, ${userName}! 🎉`, description: "Your commitment to wellness shines through" },
      { message: `Look at you building healthy habits! 🌟`, description: "Every small win adds up to big transformations" }
    ],
    encouraging: [
      { message: `Every small step counts, ${userName} 💫`, description: "Building habits that transform your daily life" },
      { message: `You're on the right path, ${userName} 🚀`, description: "Trust the process and celebrate progress" },
      { message: `Keep going, ${userName}! 💪`, description: "Your future self will thank you for these choices" }
    ]
  };

  const variantMessages = messages[variant || "encouraging"];
  const selectedMessage = variantMessages[Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % variantMessages.length]; // Rotate every 6 hours

  switch (variant) {
    case "learning":
      return {
        icon: <Brain className="w-5 h-5 text-purple-600" />,
        ...selectedMessage,
        gradient: "from-purple-50 via-blue-50 to-indigo-50",
        borderColor: "border-purple-200/50"
      };
    case "adapting":
      return {
        icon: <Zap className="w-5 h-5 text-blue-600" />,
        ...selectedMessage,
        gradient: "from-blue-50 via-cyan-50 to-teal-50",
        borderColor: "border-blue-200/50"
      };
    case "celebrating":
      return {
        icon: <Heart className="w-5 h-5 text-pink-600" />,
        ...selectedMessage,
        gradient: "from-pink-50 via-rose-50 to-orange-50",
        borderColor: "border-pink-200/50"
      };
    case "encouraging":
    default:
      return {
        icon: <Sparkles className="w-5 h-5 text-emerald-600" />,
        ...selectedMessage,
        gradient: "from-emerald-50 via-green-50 to-lime-50",
        borderColor: "border-emerald-200/50"
      };
  }
};

export function MotivationalBanner({ 
  userName = "Jovana",
  variant = "encouraging",
  className = ""
}: MotivationalBannerProps) {
  const config = getBannerConfig(variant, userName);

  return (
    <Card className={`
      bg-gradient-to-r ${config.gradient} 
      border ${config.borderColor} 
      hover:shadow-lg transition-all duration-300 
      h-16 hover:scale-[1.01]
      ${className}
    `}>
      <CardContent className="p-3 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white/60 rounded-full">
              {config.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {config.message}
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">
                {config.description}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-white/40 backdrop-blur-sm h-6">
            AI Insight
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}