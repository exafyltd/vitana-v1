import { useProfile } from "@/context/ProfileProvider";
import { Brain, Clock, Archive, BookOpen } from "lucide-react";

interface MemoryMotivationalBannerProps {
  variant?: "overview" | "timeline" | "diary" | "recall" | "permissions";
  className?: string;
}

const bannerVariants = {
  overview: {
    gradient: "bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10",
    border: "border-purple-500/20",
    icon: Brain,
    iconColor: "text-purple-600"
  },
  timeline: {
    gradient: "bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10", 
    border: "border-blue-500/20",
    icon: Clock,
    iconColor: "text-blue-600"
  },
  diary: {
    gradient: "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10",
    border: "border-green-500/20", 
    icon: BookOpen,
    iconColor: "text-green-600"
  },
  recall: {
    gradient: "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10",
    border: "border-orange-500/20",
    icon: Archive,
    iconColor: "text-orange-600"
  },
  permissions: {
    gradient: "bg-gradient-to-r from-red-500/10 via-pink-500/10 to-rose-500/10",
    border: "border-red-500/20",
    icon: Archive,
    iconColor: "text-red-600"
  }
};

const messages = {
  overview: [
    "Your wellness journey is being captured beautifully, {name}!",
    "Every memory you create builds a stronger health story, {name}!",
    "Your personal AI is learning from your health patterns, {name}!",
    "Track your progress and see how far you've come, {name}!"
  ],
  timeline: [
    "Your health timeline shows incredible progress, {name}!",
    "Every milestone matters in your wellness journey, {name}!",
    "Look back and see the amazing patterns in your health, {name}!",
    "Your consistency is creating a powerful health story, {name}!"
  ],
  diary: [
    "Your daily reflections are so valuable, {name}!",
    "Each entry helps your AI understand you better, {name}!",
    "Keep documenting your wellness journey, {name}!",
    "Your voice notes are creating meaningful insights, {name}!"
  ],
  recall: [
    "Your memory recall is getting stronger, {name}!",
    "Find any health moment instantly with AI search, {name}!",
    "Your wellness data is perfectly organized, {name}!",
    "Discover hidden patterns in your health journey, {name}!"
  ],
  permissions: [
    "Your memory privacy is fully protected, {name}!",
    "You have complete control over your data, {name}!",
    "Your trust in sharing insights means everything, {name}!",
    "Keep your wellness journey secure and private, {name}!"
  ]
};

export function MemoryMotivationalBanner({ 
  variant = "overview",
  className 
}: MemoryMotivationalBannerProps) {
  const { profile } = useProfile();
  const firstName = profile?.displayName?.split(' ')[0] || 'there';
  
  const config = bannerVariants[variant];
  const Icon = config.icon;
  
  const messageList = messages[variant];
  const randomMessage = messageList[Math.floor(Math.random() * messageList.length)];
  const personalizedMessage = randomMessage.replace("{name}", firstName);
  
  return (
    <div className={`
      ${config.gradient} 
      border ${config.border} 
      rounded-xl p-4 mb-6
      hover:shadow-lg transition-all duration-300
      ${className}
    `}>
      <div className="flex items-center space-x-3">
        <div className={`${config.iconColor} flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {personalizedMessage}
        </p>
      </div>
    </div>
  );
}