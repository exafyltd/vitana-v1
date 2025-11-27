export interface DistributionTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  frequency: string;
  duration: string;
  suggestedChannels: string[];
  bestFor: string;
  config: {
    postsPerDay?: number;
    postsPerWeek?: number;
    smartSchedulingEnabled: boolean;
    autoApprove: boolean;
  };
}

export const DISTRIBUTION_TEMPLATES: DistributionTemplate[] = [
  {
    id: "launch",
    name: "Launch Campaign",
    icon: "🚀",
    description: "High frequency, all channels, 2-week duration",
    frequency: "2x per day",
    duration: "2 weeks",
    suggestedChannels: ["instagram", "linkedin", "twitter", "facebook", "email"],
    bestFor: "Product launches, major announcements",
    config: {
      postsPerDay: 2,
      smartSchedulingEnabled: true,
      autoApprove: false,
    },
  },
  {
    id: "nurture",
    name: "Nurture Campaign",
    icon: "🌱",
    description: "Low frequency, LinkedIn + Email, ongoing",
    frequency: "2x per week",
    duration: "Ongoing",
    suggestedChannels: ["linkedin", "email"],
    bestFor: "Thought leadership, community building",
    config: {
      postsPerWeek: 2,
      smartSchedulingEnabled: true,
      autoApprove: false,
    },
  },
  {
    id: "event",
    name: "Event Promotion",
    icon: "📅",
    description: "Daily posts, 2x/day in final 3 days",
    frequency: "Daily → 2x/day (final 3 days)",
    duration: "Based on event date",
    suggestedChannels: ["instagram", "linkedin", "facebook", "twitter"],
    bestFor: "Conferences, webinars, live events",
    config: {
      postsPerDay: 1,
      smartSchedulingEnabled: true,
      autoApprove: false,
    },
  },
  {
    id: "professional",
    name: "Professional Series",
    icon: "💼",
    description: "Weekly, LinkedIn + Email, long-form content",
    frequency: "Weekly",
    duration: "Ongoing",
    suggestedChannels: ["linkedin", "email"],
    bestFor: "Educational content, case studies",
    config: {
      postsPerWeek: 1,
      smartSchedulingEnabled: true,
      autoApprove: false,
    },
  },
  {
    id: "custom",
    name: "Custom",
    icon: "🎯",
    description: "Define your own rules",
    frequency: "Custom",
    duration: "Custom",
    suggestedChannels: [],
    bestFor: "Unique campaign needs",
    config: {
      smartSchedulingEnabled: true,
      autoApprove: false,
    },
  },
];

export const CHANNEL_BEST_TIMES: Record<string, string[]> = {
  instagram: ["11:00", "13:00", "19:00", "21:00"],
  linkedin: ["09:00", "11:00", "17:00", "19:00"],
  twitter: ["08:00", "10:00", "12:00", "14:00", "18:00", "20:00"],
  facebook: ["09:00", "13:00", "15:00"],
  youtube: ["14:00", "17:00", "20:00"],
  tiktok: ["07:00", "11:00", "19:00", "21:00"],
  email: ["09:00", "14:00"],
  sms: ["10:00", "15:00", "19:00"],
  whatsapp: ["09:00", "12:00", "18:00", "21:00"],
};

export const CHANNEL_INFO: Record<string, { name: string; color: string }> = {
  instagram: { name: "Instagram", color: "bg-pink-500" },
  linkedin: { name: "LinkedIn", color: "bg-blue-600" },
  twitter: { name: "Twitter/X", color: "bg-black" },
  facebook: { name: "Facebook", color: "bg-blue-500" },
  youtube: { name: "YouTube", color: "bg-red-600" },
  tiktok: { name: "TikTok", color: "bg-black" },
  email: { name: "Email", color: "bg-gray-600" },
  sms: { name: "SMS", color: "bg-green-600" },
  whatsapp: { name: "WhatsApp", color: "bg-green-500" },
};
