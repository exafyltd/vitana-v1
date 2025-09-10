import { useProfile } from "@/context/ProfileProvider";
import { DollarSign, TrendingUp, Award, Gift } from "lucide-react";

interface WalletMotivationalBannerProps {
  variant?: "overview" | "balance" | "subscriptions" | "rewards";
  activeTab?: string;
  className?: string;
}

const bannerVariants = {
  overview: {
    gradient: "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10",
    border: "border-green-500/20",
    icon: TrendingUp,
    iconColor: "text-green-600"
  },
  balance: {
    gradient: "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10",
    border: "border-blue-500/20",
    icon: DollarSign,
    iconColor: "text-blue-600"
  },
  subscriptions: {
    gradient: "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10",
    border: "border-orange-500/20",
    icon: Award,
    iconColor: "text-orange-600"
  },
  rewards: {
    gradient: "bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-red-500/10",
    border: "border-pink-500/20",
    icon: Gift,
    iconColor: "text-pink-600"
  }
};

const messages = {
  overview: [
    "Great progress — buy your next subscription and earn **250 credits** today, {name}!",
    "Amazing — complete one more action to unlock **300 bonus credits**, {name}!",
    "Excellent work — your next wallet action earns **200 extra credits**, {name}!"
  ],
  balance: {
    credits: [
      "Top up now and earn a **50 credit loyalty boost**, {name}!",
      "Add credits today and receive **25% bonus rewards**, {name}!"
    ],
    tokens: [
      "Stake your VTN today and earn **extra rewards on growth**, {name}!",
      "Convert rewards now and get **15% bonus tokens**, {name}!"
    ],
    membership: [
      "Upgrade your plan to unlock **70% coverage + 200 credits**, {name}!",
      "Premium membership gives you **500 bonus credits** this month, {name}!"
    ]
  },
  subscriptions: [
    "Activate a new subscription and receive **150 welcome credits**, {name}!",
    "Unpausing your plan gives you a **200 credit comeback bonus**, {name}!",
    "Subscribe today and earn **300 credits** in your first month, {name}!"
  ],
  rewards: [
    "Amazing — claim your rewards now and add **300 credits** to your Wallet, {name}!",
    "Share your referral link and earn **500 credits** when a friend joins, {name}!",
    "Every payout claimed celebrates your progress — earn **extra commission boosts**, {name}!"
  ]
};

export function WalletMotivationalBanner({ 
  variant = "overview", 
  activeTab,
  className 
}: WalletMotivationalBannerProps) {
  const { profile } = useProfile();
  const firstName = profile?.displayName?.split(' ')[0] || 'there';
  
  const config = bannerVariants[variant];
  const Icon = config.icon;
  
  // Get appropriate message based on variant and active tab
  const getRandomMessage = () => {
    if (variant === "balance" && activeTab) {
      const tabMessages = messages.balance[activeTab as keyof typeof messages.balance];
      if (tabMessages) {
        return tabMessages[Math.floor(Math.random() * tabMessages.length)];
      }
    }
    
    const messageList = Array.isArray(messages[variant]) 
      ? messages[variant] 
      : messages.overview;
    return messageList[Math.floor(Math.random() * messageList.length)];
  };

  const personalizedMessage = getRandomMessage().replace("{name}", firstName);

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