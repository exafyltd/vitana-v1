import { useProfile } from "@/context/ProfileProvider";
import { Heart, Sparkles, Target, TrendingUp } from "lucide-react";

interface MotivationalBannerProps {
  variant?: "encouragement" | "partnership" | "guidance" | "achievement";
  className?: string;
}

const bannerVariants = {
  encouragement: {
    gradient: "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10",
    border: "border-green-500/20",
    icon: Heart,
    iconColor: "text-green-600"
  },
  partnership: {
    gradient: "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10",
    border: "border-blue-500/20",
    icon: Sparkles,
    iconColor: "text-blue-600"
  },
  guidance: {
    gradient: "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10",
    border: "border-orange-500/20",
    icon: Target,
    iconColor: "text-orange-600"
  },
  achievement: {
    gradient: "bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-red-500/10",
    border: "border-pink-500/20",
    icon: TrendingUp,
    iconColor: "text-pink-600"
  }
};

const messages = {
  encouragement: [
    "Every day is wonderful because you are healthy, {name}!",
    "Your dedication to wellness inspires everyone around you, {name}!",
    "You're making incredible progress on your health journey, {name}!",
    "Your commitment to growth is truly admirable, {name}!"
  ],
  partnership: [
    "You and I together will make this week a successful week, {name}!",
    "Let's continue building your wellness empire together, {name}!",
    "We're an unstoppable team on this journey, {name}!",
    "Together we'll achieve all your wellness goals, {name}!"
  ],
  guidance: [
    "I will assist you to make some money. Let me guide you through the process, {name}!",
    "Ready to unlock new opportunities? I'm here to guide you, {name}!",
    "Let's turn your wellness passion into financial success, {name}!",
    "Your expertise has value - let me show you how to monetize it, {name}!"
  ],
  achievement: [
    "Your consistency is paying off in amazing ways, {name}!",
    "Look how far you've come on your wellness journey, {name}!",
    "Your positive impact on the community is incredible, {name}!",
    "You're setting an amazing example for others to follow, {name}!"
  ]
};

export function MotivationalBanner({ variant = "encouragement", className }: MotivationalBannerProps) {
  const { profile } = useProfile();
  const firstName = profile?.displayName?.split(' ')[0] || 'there';
  
  const config = bannerVariants[variant];
  const messageList = messages[variant];
  const randomMessage = messageList[Math.floor(Math.random() * messageList.length)];
  const personalizedMessage = randomMessage.replace("{name}", firstName);
  
  const Icon = config.icon;

  return (
    <div className={`${config.gradient} ${config.border} border rounded-2xl p-6 mb-8 ${className}`}>
      <div className="flex items-center space-x-4">
        <div className={`${config.iconColor} bg-background/50 rounded-full p-3`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-foreground font-medium text-lg leading-relaxed">
            {personalizedMessage}
          </p>
        </div>
      </div>
    </div>
  );
}